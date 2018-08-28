import config from "../../config/index";

function buildRequestOptions(method) {
	let headers = {
			"Content-Type": "application/json",
			//"authorization-token": window.localStorage.getItem('userToken')
		};

	let requestOptions = { 
			method: method,
			headers: headers,
		};

	return requestOptions;
}

function request(route, method, data) {
	route = config.apiUrl + route;
	var requestOptions = buildRequestOptions(method);

    if(method !== 'GET' && data)
    	requestOptions.body = JSON.stringify(data);

    return fetch(route, requestOptions)
	    .then(function(response) {
	      return response.json();
	    })
	    .then(response => {
	    	if(!response.success && response.code === -1 && response.message.toLowerCase() === 'ivalid token') {
	    		localStorage.removeItem('userToken');
	    		localStorage.removeItem('user');
	    		return window.location = "/login";
	    	}

	    	return response;
	    });
}

export default { request };