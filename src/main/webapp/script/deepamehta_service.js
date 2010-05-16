function DeepaMehtaService(service_uri) {

    // *** Topics ***

    this.get_topic = function(topic_id) {
        return request("GET", "/topic/" + topic_id)
    }

    this.get_related_topics = function(topic_id, exclude_rel_types) {
        var query_string = ""
        if (exclude_rel_types) {
            query_string = "?" + param_list(exclude_rel_types, "exclude")
        }
        return request("GET", "/topic/" + topic_id + "/related_topics" + query_string)
    }

    this.create_topic = function(topic) {
        var response = request("POST", "/topic", topic)
        return response.topic_id
    }

    this.set_topic_properties = function(topic) {
        request("PUT", "/topic/" + topic.id, topic.properties)
    }

    // *** Relations ***

    this.create_relation = function(relation) {
        var response = request("POST", "/relation", relation)
        return response.relation_id
    }

    // *** Private Helpers ***

    function param_list(value_array, param_name) {
        for (var i = 0; i < value_array.length; i++) {
            value_array[i] = param_name + "=" + value_array[i]
        }
        return value_array.join("&")
    }

    function request(method, uri, data) {
        var responseData
        if (LOG_AJAX_REQUESTS) log(method + " " + uri + "\n..... " + JSON.stringify(data))
        $.ajax({
            type: method,
            url: service_uri + uri,
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
