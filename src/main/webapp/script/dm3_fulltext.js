function dm3_fulltext() {

    doctype_implementation("script/search_result.js")
    css_stylesheet("style/search_result.css")

    db.fulltext_search = function(index, text) {
        var viewPath = this.uri + "_fti/deepamehta3/" + index + "?q=" + text
        this.last_req = this.request("GET", viewPath)      
        if (this.last_req.status == 404)
            return null
        CouchDB.maybeThrowError(this.last_req)
        return JSON.parse(this.last_req.responseText)
    }

    this.init = function() {
        $("#searchmode_select").append($("<option>").text("By Text"))
    }

    this.search_widget = function(searchmode) {
        if (searchmode == "By Text") {
            return $("<input>").attr({id: "search_field", type: "text", size: SEARCH_FIELD_WIDTH})
        }
    }

    this.search = function(searchmode) {
        if (searchmode == "By Text") {
            // 1) perform fulltext search
            var searchterm = $.trim($("#search_field").val())
            var result = db.fulltext_search("search", searchterm + "*")
            // 2) create result topic
            return create_result_topic(searchterm, result.rows, "SearchResult", function(row) {
                return {
                    id:    row.id,
                    type:  row.fields.topic_type,
                    label: row.fields.topic_label
                }
            })
        }
    }
}
