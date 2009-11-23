function SearchResult() {
}

SearchResult.prototype = {



    /**************************************************************************************************/
    /**************************************** Overriding Hooks ****************************************/
    /**************************************************************************************************/



    render_document: function(doc) {
        // heading
        var heading = "Search Result " + doc.fields[0].content + " (" + doc.items.length + " documents)"
        $("#detail-panel").append($("<div>").addClass("result-heading").text(heading))
        // result items
        var table = $("<table>")
        for (var i = 0, item; item = doc.items[i]; i++) {
            var icon_td = $("<td>").addClass("result-item").css("text-align", "center")
                icon_td.append(this.result_item_anchor(item, type_icon_tag(item.topic_type, "type-icon")))
            var item_td = $("<td>").addClass("result-item").append(this.render_result_item(item))
            table.append($("<tr>").append(icon_td).append(item_td))
        }
        $("#detail-panel").append(table)
    },

    context_menu_items: function() {
        return [
            {label: "Remove", function: "remove"}
        ]
    },



    /************************************************************************************************/
    /**************************************** Custom Methods ****************************************/
    /************************************************************************************************/



    render_result_item: function(item) {
        return $("<div>").append(this.result_item_anchor(item, item.topic_label))
    },

    result_item_anchor: function(item, anchor_content) {
        return $("<a>").attr({href: ""}).append(anchor_content).click(function() {
            reveal_document(item.id)
            return false
        })
    },

    /* Context Menu Commands */

    remove: function() {
        remove_document(true)
    }
}
