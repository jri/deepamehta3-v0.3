package de.deepamehta.storage.neo4j;

import de.deepamehta.storage.Storage;
import de.deepamehta.service.Topic;
import de.deepamehta.service.Association;

import org.neo4j.graphdb.GraphDatabaseService;
import org.neo4j.graphdb.Node;
import org.neo4j.graphdb.Relationship;
import org.neo4j.graphdb.RelationshipType;
import org.neo4j.graphdb.Transaction;
import org.neo4j.kernel.EmbeddedGraphDatabase;

import java.util.Map;
import java.util.HashMap;
import java.util.List;



public class Neo4jStorage implements Storage {

    private GraphDatabaseService graphDb;

    private enum RelType implements RelationshipType {
        TOPIC_TYPE, DATA_FIELD, INSTANCE
    }

    public Neo4jStorage(String dbPath) {
        System.out.println("### Creating storage based on Neo4j");
        graphDb = new EmbeddedGraphDatabase(dbPath);
    }

    // Storage implementation

    public Topic getTopic(long id) {
        Map properties = null;
        Transaction tx = graphDb.beginTx();
        try {
            System.out.println("### Neo4j: getting node " + id);
            Node node = graphDb.getNodeById(id);
            properties = getNodeProperties(node);
            //
            tx.success();   
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            return new Topic(id, null, properties);     // ### type_id yet unknown
        }
    }

    public Topic createTopic(String type_id, Map properties) {
        Node node = null;
        Transaction tx = graphDb.beginTx();
        try {
            node = graphDb.createNode();
            System.out.println("### Neo4j: creating node, ID=" + node.getId());
            //
            setNodeType(node, type_id);
            setNodeProperties(node, properties);
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            return new Topic(node.getId(), type_id, properties);
        }
    }

    public void setTopicProperties(long id, Map properties) {
        Transaction tx = graphDb.beginTx();
        try {
            System.out.println("### Neo4j: setting properties of node " + id + ": " + properties.toString());
            Node node = graphDb.getNodeById(id);
            setNodeProperties(node, properties);
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
        }
    }

    public Association createAssociation(long src_topic_id, long dst_topic_id, String type_id, Map properties) {
        return null;
    }

    public void createTopicType(Map properties, List<Map> fieldDefinitions) {
        Transaction tx = graphDb.beginTx();
        try {
            Node type = graphDb.createNode();
            System.out.println("### Neo4j: creating topic type \"" + properties.get("type_id") + "\", ID=" + type.getId());
            setNodeProperties(type, properties);
            graphDb.getReferenceNode().createRelationshipTo(type, RelType.TOPIC_TYPE);
            //
            for (Map fieldDefinition : fieldDefinitions) {
                Node fieldDef = graphDb.createNode();
                setNodeProperties(fieldDef, fieldDefinition);
                type.createRelationshipTo(fieldDef, RelType.DATA_FIELD);
            }
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
        }
    }

    public void shutdown() {
        System.out.println("### Shutdown Neo4j storage");
        graphDb.shutdown();
    }

    // Helper

    private void setNodeType(Node node, String type_id) {
    }

    private Map getNodeProperties(Node node) {
        Map properties = new HashMap();
        for (String key : node.getPropertyKeys()) {
            properties.put(key, node.getProperty(key));
        }
        return properties;
    }

    private void setNodeProperties(Node node, Map<String, String> properties) {
        for (String key : properties.keySet()) {
            node.setProperty(key, properties.get(key));
        }
    }
}
