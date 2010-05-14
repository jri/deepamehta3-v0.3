package de.deepamehta.service;

import de.deepamehta.storage.Storage;
import de.deepamehta.storage.neo4j.Neo4jStorage;

import java.util.Map;



public class EmbeddedService {

    public static final EmbeddedService SERVICE = new EmbeddedService();

    private final Storage storage;

    private EmbeddedService() {
        System.out.println("### Creating embedded DeepaMehta Service");
        this.storage = new Neo4jStorage("/Users/jri/var/db/deepamehta-db-neo4j");
    }

    public Topic createTopic(String type, Map properties) {
        return storage.createTopic(type, properties);
    }

    public void setTopicProperties(long id, Map properties) {
        storage.setTopicProperties(id, properties);
    }

    public void shutdown() {
        storage.shutdown();
    }
}
