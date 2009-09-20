function dm3_fulltext() {

    // alert("Plugin dm3-fulltext loaded!")

    this.name = "dm3-fulltext"

    doctype_implementation("javascript/search_result.js")
    css_stylesheet("style/search_result.css")

    /* --- Search Modes --- */

    this.searchmode = function() {
        return "Fulltext"
    }

    this.search_widget = function(searchmode) {
        if (searchmode == "Fulltext") {
            return $("<input>").attr({id: "search_field", type: "text"})
        }
    }

    this.search = function(searchmode) {
        if (searchmode == "Fulltext") {
            var searchterm = $("#search_field").val()
            var result = db.fulltext_search(searchterm)
            // build result document
            var result_doc = {fields: [{id: "Title", content: '"' + searchterm + '"'}], implementation: "SearchResult", items: []}
            for (var i = 0, row; row = result.rows[i]; i++) {
                result_doc.items.push({"id": row.id, "title": row.fields ? row.fields["Title"] : "?"})
            }
            return result_doc
        }
    }
}
