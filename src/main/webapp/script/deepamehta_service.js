function DeepaMehtaService(uri) {

    this.get_topic = function(topic_id) {
        return request("GET", uri + "topic/" + topic_id)
    }

    this.get_related_topics = function(topic_id, exclude_rel_types) {
        var query_string = ""
        if (exclude_rel_types) {
            for (var i = 0; i < exclude_rel_types.length; i++) {
                exclude_rel_types[i] = "exclude=" + exclude_rel_types[i]
            }
            query_string = "?" + exclude_rel_types.join("&")
        }
        return request("GET", uri + "topic/" + topic_id + "/relationships" + query_string)
    }

    this.create_topic = function(topic) {
        var response = request("POST", uri + "topic", topic)
        return response.topic_id
    }

    this.set_topic_properties = function(topic) {
        request("PUT", uri + "topic/" + topic.id, topic.properties)
    }

    function request(method, uri, data) {
        var responseData
        if (LOG_AJAX_REQUESTS) log(method + " " + uri + "\n..... " + JSON.stringify(data))
        $.ajax({
            type: method,
            url: uri,
            contentType: "application/json",
            data: JSON.stringify(data),
            processData: false,
            async: false,
            success: function(data, textStatus, xhr) {
                if (LOG_AJAX_REQUESTS) log("..... " + xhr.status + " " + xhr.statusText +
                    "\n..... " + JSON.stringify(data))
                responseData = data
            },
            error: function(xhr, textStatus, exception) {
                if (LOG_AJAX_REQUESTS) log("..... " + xhr.status + " " + xhr.statusText +
                    "\n..... exception: " + JSON.stringify(exception))
            }
        })
        return responseData
    }
}
