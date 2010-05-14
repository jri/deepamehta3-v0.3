package de.deepamehta.storage.neo4j;

import de.deepamehta.storage.Storage;
import de.deepamehta.service.Topic;

import org.neo4j.graphdb.GraphDatabaseService;
import org.neo4j.graphdb.Node;
import org.neo4j.graphdb.Relationship;
import org.neo4j.graphdb.RelationshipType;
import org.neo4j.graphdb.Transaction;
import org.neo4j.kernel.EmbeddedGraphDatabase;

import java.util.Map;



public class Neo4jStorage implements Storage {

    private GraphDatabaseService graphDb;

    public Neo4jStorage(String dbPath) {
        System.out.println("### Creating storage based on Neo4j");
        graphDb = new EmbeddedGraphDatabase(dbPath);
    }

    // Storage implementation

    public Topic createTopic(String type, Map properties) {
        Node node = null;
        Transaction tx = graphDb.beginTx();
        try {
            node = graphDb.createNode();
            System.out.println("### Creating node, ID=" + node.getId());
            //
            setNodeType(node, type);
            setNodeProperties(node, properties);
            //
            tx.success();
        } catch (Throwable e) {
            System.out.println("### ERROR while creating node: " + e);
        } finally {
            tx.finish();
            return new Topic(node.getId(), type, properties);
        }
    }

    public void setTopicProperties(long id, Map properties) {
        System.out.println("### Set node properties, ID=" + id);
    }

    public void shutdown() {
        System.out.println("### Shutdown Neo4j storage");
        graphDb.shutdown();
    }

    // Helper

    private void setNodeType(Node node, String type) {
    }

    private void setNodeProperties(Node node, Map<String, String> properties) {
        for (String key : properties.keySet()) {
            node.setProperty(key, properties.get(key));
        }
    }
}
