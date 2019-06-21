function drop(e) {
    e.preventDefault();

    // Dropped text file
    const file = e.dataTransfer.items[0].getAsFile();
    
    const reader = new FileReader();
    reader.onload = event => {
        readFile(event.target.result);
    }
    reader.readAsText(file);
}

function allowDrop(e) {
    e.preventDefault();
}

function readFile(file) {
    // Split to each line and loop through tem 
    const lines = file.split(/\n/g);

    let positions = [];
    let average = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes("Login queue position")) {
            const data = handleLine(line);
            positions.push(data);
        }
    }

    calculateEst(positions);
}

function handleLine(line) {
    const split = line.split(/\|/g);

    // Remove numbers at start, if there's any and just take the seconds
    // Milliseconds add unnecessary complexity in a queue that takes 20 hours anyway
    const seconds = split[0].replace(/^0{1,}/g, "").split(".")[0];
    const position = split[3].replace(" Login queue position is ", "").replace("\r", "");

    const data = {seconds, position};

    return data;
}

function calculateEst(data) {
    const first = data[0];
    const last = data[data.length - 1];

    // Calculate how many positions we have moved since joining
    const deltaPos = first.position - last.position;

    // Calculate for how long we've been in the queue (in seconds)
    const deltaTime = last.seconds - first.seconds;

    const delta = deltaPos / deltaTime;

    const timeLeft = last.position / delta;
    const date = new Date(null);
    date.setSeconds(timeLeft);

    const left = date.toISOString().substr(11, 8);

    updateUI(last, left, timeLeft);
}

function updateUI(last, left, timeLeft) {
    const date = new Date();
    date.setSeconds(date.getSeconds() + timeLeft)

    $("#pos")[0].innerText = `Login queue position: ${last.position}`;
    $("#est")[0].innerText = `Estimated time left in queue: ${left}`;
    $("#time")[0].innerText = `This means you'll be able to log in at: ${date.toString()}`
}