require("dotenv").config();
require("isomorphic-fetch");
const http = require("http");
const port = process.env.PORT || 5000;

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

const server = http.createServer(async (req, response) => {
  const {url, key} = req.headers;
  console.log(req.headers)
  response.writeHead(401, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  if(!url || !key) {
    response.end(JSON.stringify({"error": "missing arguments"}));
  }
  const printStatus = await getApiData({url, key});
  response.end(JSON.stringify(printStatus));
});
server.on("clientError", (err, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});
server.listen(port);
console.log(`server running on port ${port}`);
