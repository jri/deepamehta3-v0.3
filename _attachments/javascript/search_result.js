function SearchResult() {
}

SearchResult.prototype = {

    render_document: function(doc) {
        var heading = "Search Result " + doc.fields[0].content + " (" + doc.items.length + " documents)"
        $("#detail_panel").append($("<div>").addClass("result_heading").text(heading))
        for (var i = 0, item; item = doc.items[i]; i++) {
            $("#detail_panel").append(this.render_result_item(item))
        }
    },

    context_menu_items: function() {
        return [
            {label: "Remove", function: "remove"}
        ]
    },

    /* Context Menu Commands */

    remove: function() {
        remove_document(true)
    },

    /**************************************** Helper ****************************************/

    render_result_item: function(item) {
        var a = $("<a>").attr({href: "", onclick: "reveal_document('" + item.id + "'); return false"}).text(item.title)
        return $("<div>").addClass("result_item").append(a)
    }
}
