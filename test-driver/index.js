const { fetch } = require("cross-fetch");

const startTimer = function() {
    timer = new Date();
    return timer;
}

const endTimer = function() {
    timer = new Date();
    return timer;
}

const deltaTime = function(startTime, endTime) {
    let deltaTime = endTime - startTime; // milliseconds
    return deltaTime;
}

const setupServer = function() {

}

const main = function() {
    let startTime = startTimer();
    const query = `
        query {
            myTracks {
                id,
                title
            }
        }
    `;
    fetch("http://localhost:4001/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Cache-Control": "no-cache"
        },
        cache: "no-store",
        body: JSON.stringify({
            query: query
        })
    }).then(response => {
        return response.json();
    }).then(data => {
        let endTime = endTimer();
        console.log(deltaTime(startTime, endTime));
    })
}

main();