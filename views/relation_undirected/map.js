function(doc) {
    if (doc.type == "Relation") {
        emit([doc.rel_doc_ids[0], doc.rel_doc_ids[1], doc.rel_type], null)
        emit([doc.rel_doc_ids[1], doc.rel_doc_ids[0], doc.rel_type], null)
    }
}
