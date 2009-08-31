function(doc) {
    if (doc.tags) {
        for (var i in doc.tags) {
            emit(doc.tags[i], doc)
        }
    }
}
