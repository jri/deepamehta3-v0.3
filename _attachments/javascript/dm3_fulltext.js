function dm3_fulltext() {

    doctype_implementation("javascript/search_result.js")
    css_stylesheet("style/search_result.css")

    this.init = function() {
        $("#searchmode_select").append($("<option>").text("Fulltext"))
    }

    this.search_widget = function(searchmode) {
        if (searchmode == "Fulltext") {
            return $("<input>").attr({id: "search_field", type: "text"})
        }
    }

    this.search = function(searchmode) {
        if (searchmode == "Fulltext") {
            // 1) perform fulltext search
            var searchterm = $("#search_field").val()
            var result = db.fulltext_search("search", searchterm + "*")
            // 2) build result document
            // create result topic
            var fields = [{id: "Title", content: '"' + searchterm + '"'}]
            var view = {icon_src: "images/bucket.png"}
            var result_doc = create_raw_topic("Search Result", fields, view, "SearchResult")
            // add result items
            result_doc.items = []
            for (var i = 0, row; row = result.rows[i]; i++) {
                result_doc.items.push({
                    id:          row.id,
                    topic_label: row.fields.topic_label,
                    topic_type:  row.fields.topic_type
                })
            }
            //
            return result_doc
        }
    }
}
