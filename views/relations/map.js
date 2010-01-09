function(doc) {
    if (doc.type == "Relation") {
        emit(doc._id, {
            rel_type: doc.rel_type,
            doc1_id: doc.rel_doc_ids[0],
            doc2_id: doc.rel_doc_ids[1]
        })
    }
}
