function SearchResult() {

    this.render_document = function(doc) {
        var heading = "Search Result " + doc.fields[0].content + " (" + doc.items.length + " docments)"
        $("#detail_panel").append($("<p>").text(heading))
        for (var i = 0, item; item = doc.items[i]; i++) {
            var a = $("<a>").attr({href: "", onclick: "reveal_document('" + item.id + "'); return false"}).text(item.title)
            $("#detail_panel").append($("<p>").append(a))
        }
    }

    this.context_menu_items = function() {
        return [
            {label: "Remove", function: "remove"}
        ]
    }

    /* Context Menu Commands */

    this.remove = function() {
        remove_document(true)
    }
}
