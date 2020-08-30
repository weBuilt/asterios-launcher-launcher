// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.
const {ipcRenderer} = require('electron')

const selectDirBtn = document.getElementById("select-asterios-path")
const loginsBody = document.getElementById("logins-table-body")

selectDirBtn.addEventListener('click', (_) => {
    ipcRenderer.send('open-file-dialog')
})

ipcRenderer.on('selected-directory', (event, path) => {
    document.getElementById("asterios-path").innerHTML = path.toString();
    selectDirBtn.remove();
})

const askAsteriosPathOnLoad = ipcRenderer.sendSync('synchronous-message', ["asterios-path-specified"])
let command = askAsteriosPathOnLoad.toString();
if (askAsteriosPathOnLoad instanceof Array) command = askAsteriosPathOnLoad[0];
switch (command) {
    case "asterios-path-specified":
        document.getElementById("asterios-path").innerHTML = askAsteriosPathOnLoad[1];
        selectDirBtn.remove();
        break;
    case "asterios-path-not-specified":
        break;
}
const askSavedLoginsOnLoad = ipcRenderer.sendSync('synchronous-message', ["get-logins"]);
command = askSavedLoginsOnLoad.toString();
if (askSavedLoginsOnLoad instanceof Array) command = askSavedLoginsOnLoad[0];
switch (command) {
    case "none":
        break;
    case "logins":
        const parsed = JSON.parse(askSavedLoginsOnLoad[1]);
        if (parsed instanceof Array) parsed.map(
            (login, idx, _) => {
                const child = document.createElement("tr")
                child.id = "login-" + idx
                const childName = document.createElement("td")
                childName.textContent = login.name
                const childDescription = document.createElement("td")
                childDescription.textContent = login.description
                const childFilename = document.createElement("td")
                childFilename.textContent = login.filename
                childName.addEventListener("dblclick", () => {
                    ipcRenderer.send("asynchronous-message", ["launch", login.name])
                })
                child.appendChild(childName)
                child.appendChild(childDescription)
                child.appendChild(childFilename)
                if (loginsBody) loginsBody.appendChild(child)
            }
        )
}