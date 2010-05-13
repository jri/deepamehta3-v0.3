function DeepaMehtaService(uri) {

	this.getTopic = function() {
		request("POST", uri + "topic")
	}

	function request(method, uri) {
		$.ajax({
			type: method,
			url: uri,
			async: false,
			success: function(data, textStatus, xhr) {
				alert("AJAX SUCCESS\nserver status: " + textStatus +
					"\nXHR status: " + xhr.status + " " + xhr.statusText +
					"\nresponse data:\n" + JSON.stringify(data))
			},
			error: function(xhr, textStatus, exception) {
				alert("AJAX ERROR\nserver status: " + textStatus +
					"\nXHR status: " + xhr.status + " " + xhr.statusText +
					"\nexception: " + JSON.stringify(exception))
			}
		})
	}
}
