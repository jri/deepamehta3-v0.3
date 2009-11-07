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
            var searchterm = $("#search_field").val()
            var result = db.fulltext_search("search", searchterm + "*")
            // build result document
            var fields = [{id: "Title", content: '"' + searchterm + '"'}]
            var result_doc = create_topic_doc("Search Result", fields, "SearchResult", "images/bucket.png")
            result_doc.items = []
            for (var i = 0, row; row = result.rows[i]; i++) {
                result_doc.items.push({"id": row.id, "title": row.fields ? row.fields["title"] : "?"})
            }
            return result_doc
        }
    }
}
