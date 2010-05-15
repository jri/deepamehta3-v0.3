function DeepaMehtaService(uri) {

    this.createTopic = function(topic) {
        var response = request("POST", uri + "topic", topic)
        return response.topic_id
    }

    this.setTopicProperties = function(topic) {
        request("PUT", uri + "topic/" + topic.id, topic.properties)
    }

    /* function properties(doc) {
        var properties = {}
        for (var i = 0, field; field = doc.fields[i]; i++) {
            properties[field.id] = field.content
        }
        return properties
    } */

    function request(method, uri, data) {
        var responseData
        $.ajax({
            type: method,
            url: uri,
            contentType: "application/json",
            data: JSON.stringify(data),
            processData: false,
            async: false,
            success: function(data, textStatus, xhr) {
                alert("AJAX SUCCESS\nserver status: " + textStatus +
                    "\nXHR status: " + xhr.status + " " + xhr.statusText +
                    "\nresponse data:\n" + JSON.stringify(data))
                responseData = data
            },
            error: function(xhr, textStatus, exception) {
                alert("AJAX ERROR\nserver status: " + textStatus +
                    "\nXHR status: " + xhr.status + " " + xhr.statusText +
                    "\nexception: " + JSON.stringify(exception))
            }
        })
        return responseData
    }
}
