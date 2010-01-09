function(doc) {
    if (doc.type == "Relation") {
        var aux = doc.rel_type == "Auxiliary" ? 1 : 0
        var doc0_id = doc.rel_doc_ids[0]
        var doc1_id = doc.rel_doc_ids[1]
        emit([doc0_id, aux], {
            rel_doc_id: doc1_id,
            rel_doc_pos: 1,
            rel_type: doc.rel_type
        })
        // Note: a circle-relation (a topic related to itself, e.g. a topicmap topic
        // inside the very topicmap) is indexed only once.
        // Otherwise the topic would think he has 2 relations (which would confuse
        // e.g. the "delete all relations the topic is involved in" operation).
        if (doc0_id != doc1_id) {
            emit([doc1_id, aux], {
                rel_doc_id: doc0_id,
                rel_doc_pos: 0,
                rel_type: doc.rel_type
            })
        }
    }
}
