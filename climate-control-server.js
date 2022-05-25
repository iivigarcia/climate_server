const http = require('http');
const fetch = require('cross-fetch');
var fs = require('fs');
var url = require('url');
const axios = require('axios');

const hostname = '127.0.0.1';
const port = 8080;
const relay_url = '//192.168.0.183:80'

let checkScheduleTime = 10000;/*in miliseconds */
let checkTemperatureTime = 5000 ;/*in miliseconds */

let temperature_interval = null;
let setedTemperature = 25;
let sensorTemperature = 24;

let get_config_url = '/config';
let config_file_name = 'config.json';

let boilerOn = false;


const api = axios.create({baseURL: 'http://192.168.0.183:80'});
        



const data = fs.readFileSync('config.json', 'utf8');

let configuration = JSON.parse(data);
setInterval(() => manage_schedule(configuration.schedule,boilerOn),checkScheduleTime);




const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  manage_req(req,res);
  res.end();
});

server.listen(port, hostname, () => {
  console.log(`El servidor se está ejecutando en http://${hostname}:${port}/`);
});






function checktemperature(temperature, setedTemperature){

      if(temperature < setedTemperature){
        api.get('relay_on').catch(console.log);
        console.log("prendi el relay despues de comparar las temperaturas");
      }else{
      api.get('relay_off').catch(console.log);
      }
      
}




function manage_schedule(schedule,boilerOn){

  let now = new Date();
  let schedule_value = "off"
    
  for(let i = 0; i < 24; i++){
    if(schedule[i].id === now.getHours()+":00"){
      schedule_value = schedule[i].value;
    }
  }
  if(schedule_value === 'on' && temperature_interval === null){
    temperature_interval = setInterval(() => checktemperature(sensorTemperature,setedTemperature), checkTemperatureTime);
    
  }
  if(schedule_value === 'off'){
    api.get('/relay_off').catch(console.log);
    if(temperature_interval!== null){
      clearInterval(temperature_interval);
      temperature_interval = null;  
         
    }
  }
}




function manage_req(req,res){
  
  const data = url.parse(req.url,true);
  const incoming_url = data.pathname;
  const query_data = data.query;

  switch(incoming_url){
    
    case get_config_url:
      res.setHeader("Content-Type", "application/json")
      res.write(JSON.stringify(configuration));
      break;
    
    case "/temperature":
      res.setHeader("Content-Type", "text/plain")
      if(JSON.parse(JSON.stringify(query_data)).temp === undefined){
        res.write("Error, parameter temp does not exist, please send temp=TEMPERATURE_VALUE");
      }else{
      console.log(JSON.parse(JSON.stringify(query_data)).temp);
      res.write("temperature received");
      }
      break;
    
    case "/config_update":
      res.setHeader("Content-Type","text/plain")
      if(JSON.parse(JSON.stringify(query_data)).id === undefined){
        console.log("error");
        
        res.write("Error, parameter id");
      }else{
        let received_id = JSON.parse(JSON.stringify(query_data)).id;
        let received_value = JSON.parse(JSON.stringify(query_data)).value;
      
        for(let i = 0; i < 24; i++){
          if(configuration.schedule[i].id === received_id){
            configuration.schedule[i].value = received_value;
            updateFile(JSON.stringify(configuration));
            res.write(`hour:${received_id}value${received_value}has been updated`);
            break;
          }
        }
      
      }
      break;
    
    default:
      res.setHeader("Content-Type","text/plain")
      res.write("request method not found");

  }
}

function updateFile(data){
  fs.writeFile(config_file_name, data, err => {
    if (err) {
      console.error(err);
    }
  });
}