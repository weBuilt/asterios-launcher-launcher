// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.
const {ipcRenderer} = require('electron')

const selectDirBtn = document.getElementById("select-asterios-path")
const killAllBtn = document.getElementById("kill-all-button")
const loginsBody = document.getElementById("logins-table-body")
const addLoginButton = document.getElementById("add-login-button")
const addLoginForm = document.getElementById("new-login-form")
const addLoginName= document.getElementById("add-login-name") as HTMLInputElement
const addLoginDescription = document.getElementById("add-login-description") as HTMLInputElement
const allContent = document.getElementById("dependent-content") as HTMLDivElement
const launchCurrent = document.getElementById("launch-current-button")
const deleteCurrent = document.getElementById("delete-current-button")
const updateCurrent = document.getElementById("update-current-button")
const selectLoginGroupName = "select-login-button"
const version = document.getElementById("app-version")
const closeNotificationButton = document.getElementById("close-button")
const restartButton = document.getElementById("restart-button")
const notification = document.getElementById('notification')
const message = document.getElementById('message')
const closeForm = document.getElementById("submit-form")
const devka = document.getElementById("devka") as HTMLImageElement

allContent.style.display = "none"

killAllBtn.addEventListener("click", (_) => {
    ipcRenderer.send('asynchronous-message', ["kill-all"])
})

closeForm.addEventListener("click", () => {
    addLoginButton.hidden = false;
    addLoginForm.hidden = true;
})

addLoginButton.addEventListener("click", (_) => {
    addLoginButton.hidden = true;
    addLoginForm.hidden = false;
})
launchCurrent.addEventListener("click", (_) => {
    ipcRenderer.send('asynchronous-message', ["launch-current"])
})
deleteCurrent.addEventListener("click", (_) => {
    const reply = ipcRenderer.sendSync('synchronous-message', ["delete"]) as string
    const rowToDelete = document.getElementById(reply)
    rowToDelete.parentNode.removeChild(rowToDelete);
})
updateCurrent.addEventListener("click", (_) => {
    ipcRenderer.send('asynchronous-message', ["update"]);
})

addLoginForm.addEventListener("submit", (event) => {
    event.preventDefault()
    if (addLoginName.value && addLoginName.value.length > 0) {
        console.log("saving", addLoginName.value)
        const saved = ipcRenderer.sendSync('synchronous-message', [
            "save-new-login",
            addLoginName.value,
            addLoginDescription.value ? addLoginDescription.value : "",
        ])
        if (saved as boolean) {
            console.log("saved")
            refreshLogins();
        }
    }
    addLoginForm.hidden = true
    addLoginButton.hidden = false
})

selectDirBtn.addEventListener('click', (_) => {
    ipcRenderer.send('open-file-dialog')
})

ipcRenderer.on('selected-directory', (event, path) => {
    document.getElementById("asterios-path").innerHTML = path.toString();
    allContent.style.display = "block"
    // selectDirBtn.remove();
})
refreshAsteriosPath();
refreshLogins();
ipcRenderer.send('app_version');
ipcRenderer.on('app_version', (event, arg) => {
    ipcRenderer.removeAllListeners('app_version');
    version.innerText = "Version " + arg.version
})

function refreshAsteriosPath() {
    const response = ipcRenderer.sendSync('synchronous-message', ["asterios-path-specified"])
    const command = (response instanceof Array) ? response[0] : response.toString();
    switch (command) {
        case "asterios-path-specified":
            document.getElementById("asterios-path").innerHTML = response[1];
            allContent.style.display = "block"
            // selectDirBtn.remove();
            break;
        case "asterios-path-not-specified":
            break;
    }
}

function refreshLogins() {
    const response = ipcRenderer.sendSync('synchronous-message', ["get-logins"]);
    const command = (response instanceof Array) ? response[0] : response.toString();
    loginsBody.innerHTML = "";
    switch (command) {
        case "none":
            break;
        case "logins":
            const parsed = JSON.parse(response[1]);
            if (parsed instanceof Array) parsed.map(
                (login, idx, _) => {
                    const child = document.createElement("tr")
                    child.id = login.id
                    const childName = document.createElement("td")
                    childName.textContent = login.name
                    const childDescription = document.createElement("td")
                    childDescription.textContent = login.description
                    const childRadioButton: HTMLInputElement = document.createElement("input")
                    childRadioButton.type = "radio"
                    childRadioButton.name = selectLoginGroupName
                    childRadioButton.addEventListener("click", () => {
                        ipcRenderer.send("asynchronous-message", ["set", login.id])
                    })
                    child.addEventListener("dblclick", () => {
                        ipcRenderer.send("asynchronous-message", ["launch", login.id])
                        childRadioButton.checked = true;
                    })
                    child.appendChild(childRadioButton)
                    child.appendChild(childName)
                    child.appendChild(childDescription)
                    if (loginsBody) loginsBody.appendChild(child)
                }
            )
    }
}


function closeNotification() {
    notification.classList.add('hidden');
}
closeNotificationButton.addEventListener("click", closeNotification)
function restartApp() {
    ipcRenderer.send('restart_app');
}
restartButton.addEventListener("click", restartApp)
ipcRenderer.on('update_available', () => {
    ipcRenderer.removeAllListeners('update_available');
    message.innerText = 'A new update is available. Downloading now...';
    notification.classList.remove('hidden');
});
ipcRenderer.on('update_downloaded', () => {
    ipcRenderer.removeAllListeners('update_downloaded');
    message.innerText = 'Update Downloaded. It will be installed on restart. Restart now?';
    restartButton.classList.remove('hidden');
    notification.classList.remove('hidden');
});
const selectedDevka = ipcRenderer.sendSync('devka') as string;
devka.src = selectedDevka