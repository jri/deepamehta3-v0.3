function DeepaMehtaService(uri) {

    this.createTopic = function(doc) {
        var data = {type: doc.topic_type, properties: properties(doc)}
        request("POST", uri + "topic", data)
    }

    this.setTopicProperties = function(doc) {
        request("PUT", uri + "topic/" + doc._id, properties(doc))
    }

    function properties(doc) {
        var properties = {}
        for (var i = 0, field; field = doc.fields[i]; i++) {
            properties[field.id] = field.content
        }
        return properties
    }

    function request(method, uri, data) {
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
            },
            error: function(xhr, textStatus, exception) {
                alert("AJAX ERROR\nserver status: " + textStatus +
                    "\nXHR status: " + xhr.status + " " + xhr.statusText +
                    "\nexception: " + JSON.stringify(exception))
            }
        })
    }
}
