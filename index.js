require("dotenv").config();
require("isomorphic-fetch");
const http = require("http");
const port = process.env.PORT || 5000;

const testData = {
  bed: 60.62,
  tool0: 205.4,
  state: 'Printing',
  printTime: 4365,
  printTimeLeft: 456,
  name: 'vase.gcode',
  completion: 54.34
}

const jobAdapter = ({ job, progress, state }) => {
  const { printTime, printTimeLeft, completion } = progress;
  const name = job.file.name;
  if(state === 'Offline') return {state};
  return {
    printTime,
    printTimeLeft,
    completion: completion.toFixed(2),
    name,
    state,
  };
};

const printerAdapter = ({ temperature }) => {
  if(Object.keys(temperature).length < 1) return {};
  return {
    bed: temperature.bed.actual,
    tool0: temperature.tool0.actual
  };
};

///api/printer
const getApiData = async ({ url, key }) => {
  const headers = { headers: { "X-Api-Key": key } };
  let printer = {};
  const job = await fetch(`${url}/api/job`, headers)
    .then((res) => res.json())
    .then((json) => {
      return jobAdapter(json);
    });
  if (job.state !== "Offline") {
    printer = await fetch(`${url}/api/printer`, headers)
      .then((res) => res.json())
      .then((json) => printerAdapter(json));
  }
  return {
    ...job,
    ...printer,
  };
};
const header = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};
const server = http.createServer(async (req, response) => {
  const {url, key} = req.headers;
  if(url === 'test') {
    response.writeHead(200, header);
    response.end(JSON.stringify(testData));
    return;
  }
  console.log(req.headers)
  if(!url || !key) {
    response.writeHead(401, header);
    response.end(JSON.stringify({"error": "missing arguments"}));
    return;
  }
  try {
    response.writeHead(200, header);
    const printStatus = await getApiData({url, key});
    response.end(JSON.stringify(printStatus));
  } catch(err) {
    response.writeHead(500, header);
    response.end(JSON.stringify({"error": "not sure, time to look at the logs"}));
  }

});
server.on("clientError", (err, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});
server.listen(port);
console.log(`server running on port ${port}`);
