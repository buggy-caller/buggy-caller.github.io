var CallState = {
  IDLE: 1,
  CONNECTED: 2,
};
gCallState = CallState.IDLE;

function getHelp(method, data) {
    jsonData = {'message': "Cisco Caller Help\nUse:\n    To call: call [h.323 | sip] &ltnumber&gt &ltbandwidth&gt\n    To disconnect: disconnect\n    For program information: info" , 'outcome': 'info' };
    return JSON.stringify(jsonData);
}

function getInfo(method, data) {
    jsonData = {'message': "Tottaly Real Calling Client\nVersion 2.1(1.13)\n(c) ADD_YEAR ADD_COMPANY", 'outcome': 'info' };
    return JSON.stringify(jsonData);
}

function getCall(method, data) {
    if (method=='POST') {
        if (data==null || !data.hasOwnProperty('protocol') || !data.hasOwnProperty('number')) {
            return JSON.stringify({"outcome": "error", "message": 'Invalid command call [h.323 | sip] number'});
        }
        if (!(['sip', 'h.323'].includes(data['protocol']))) {
            return JSON.stringify({"outcome":"error", "message": 'Invalid protocol'});
        }
        if (gCallState==CallState.CONNECTED) {
            return JSON.stringify({"outcome":'error', 'message': 'already on a call'});
        }
        if (!isNaN(data['number'])) {
            console.log("debug: number is numeric") // remove me before shipping
            var number = parseInt(data['number']);
            if (data['protocol']=='sip') {
                if (number % 2 != 0) {
                    return JSON.stringify({'outcome': 'error', "message": 'Call failed'});
                }
            }
            if (data['protocol']=='h.323') {
                if (number > 3719114527) {
                    return JSON.stringify({'outcome': 'error', "message": 'Call failed'});
                }
            }
        }
        else if ((typeof data['number'] === 'string' || data['number'] instanceof String) && data['protocol']=='sip') {
            console.log("debug: number is not numeric") // remove me before shipping
            if (data['number'].length > 255) {
                return JSON.stringify({"outcome": "error", 'message': 'sip uri too long'});
            }
            if (!(data['number'].includes('@'))) {
                return JSON.stringify({'outcome': "error", 'message': 'not a valid sip uri'});
            }
        }
        gCallState = CallState.CONNECTED;
        return JSON.stringify({'outcome': 'success', "message": 'Call connected to '+data['number'].slice(0,20)});
    }
    else if (method=='DELETE') {
        gCallState = CallState.IDLE;
        return JSON.stringify({'outcome': 'success', "message":  'Disconnected call'});
    }
    else return JSON.stringify({'outcome': "error", 'message': 'invalid method'});
}

const inputCheck = (val) => {
    const callRegex = /call (sip|h\.323) ([^\\ ]+)$/g;
    let method;
    let callback;
    let data;
    let valid = false;

    switch(val) {
        case 'i':
            method = 'GET';
            callback = getHelp;
            data = null;
            valid = true;
            break;
        case 'info':
            method = "GET";
            callback = getInfo;
            data = null;
            valid = true;
            break;
        case 'disconnect':
            method = "DELETE"
            callback = getCall;
            data = null;
            valid = true;
            break;
    }
    const matches = callRegex.exec(val);
	if (matches) {
		method = "POST"
		callback = getCall;
		data = {"protocol": matches[1], "number": matches[2]};
		valid = true;
	}
	return { valid, method, callback, data };
};

const successFunction = (data, returnedInputMethod) => {
    const callerOutput = document.querySelector('.callerOutput');
    const callImageA = document.querySelector('.callImagesA');
    const callImageB = document.querySelector('.callImagesB');

    callerOutput.classList.remove('error', 'success');
    callerOutput.classList.add(data.outcome);
    callerOutput.innerHTML = data.message;

    if (returnedInputMethod.callback == getCall && returnedInputMethod.method == 'POST') {
        const image1 = document.createElement('IMG');
        const image2 = document.createElement('IMG');
        image1.src = 'static/images/user-voice-line.png';
        image2.src = 'static/images/user-voice-line-r.png';
        callImageA.appendChild(image1);
        callImageB.appendChild(image2);
    }
    if  (returnedInputMethod.callback == getCall && returnedInputMethod.method == 'DELETE') {
        callImageA.innerHTML = '';
        callImageB.innerHTML = '';
    }
};

const failureFunction = (err) => {
    const callerOutput = document.querySelector('.callerOutput');

    callerOutput.classList.remove('success');
    callerOutput.classList.add(err.outcome);
    callerOutput.innerHTML = `Error seen ${err.message}`;
};

const handleInput = (returnedInputMethod) => {
    var resultString = returnedInputMethod.callback(returnedInputMethod.method, returnedInputMethod.data);
    try {
        var result = JSON.parse(resultString);
        if (result['outcome']=="error") failureFunction(result);
        else successFunction(result, returnedInputMethod)
    }
    catch (e) {
        failureFunction(e);
    }
};


const submit = document.querySelector('.c-button--submit');

submit.onclick = (event) => {
    event.preventDefault();
    const input = document.querySelector('.input');
    const inputValue = input.value;
    const returnedInputMethod = inputCheck(inputValue);
    const callerOutput = document.querySelector('.callerOutput');

    if (returnedInputMethod.valid) {
        handleInput(returnedInputMethod);
    } else {
        callerOutput.classList.add('error');
        if (inputValue.startsWith('call')) {
            callerOutput.innerHTML = 'Invalid command: Use: call [h.323 | sip] &ltnumber&gt';
        } else {
            callerOutput.innerHTML = `Invalid command: ${inputValue} Enter 'i' for help`;
        }
    }
}