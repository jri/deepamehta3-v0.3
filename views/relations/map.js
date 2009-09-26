function(doc) {
    if (doc.type == "Relation") {
        var aux = doc.rel_type == "Auxiliary" ? 1 : 0
        emit([doc.rel_doc_ids[0], aux], {
            rel_doc_id: doc.rel_doc_ids[1],
            rel_doc_pos: 1,
            rel_type: doc.rel_type
        })
        emit([doc.rel_doc_ids[1], aux], {
            rel_doc_id: doc.rel_doc_ids[0],
            rel_doc_pos: 0,
            rel_type: doc.rel_type
        })
    }
}
