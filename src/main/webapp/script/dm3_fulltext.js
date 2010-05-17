function dm3_fulltext() {

    doctype_implementation("script/search_result.js")
    css_stylesheet("style/search_result.css")

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
            var searchterm = $.trim($("#search_field").val())
            return dms.fulltext_search("search", searchterm)
        }
    }
}
