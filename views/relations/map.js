function(doc) {
    if (doc.fields && doc.related_ids) {
        for (var i = 0, rel_id; rel_id = doc.related_ids[i]; i++) {
            emit(rel_id, doc.fields[0].content)
        }
    }
}
