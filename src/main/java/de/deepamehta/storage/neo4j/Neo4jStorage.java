package de.deepamehta.storage.neo4j;

import de.deepamehta.storage.Storage;
import de.deepamehta.service.Topic;
import de.deepamehta.service.Association;

import org.neo4j.graphdb.Direction;
import org.neo4j.graphdb.GraphDatabaseService;
import org.neo4j.graphdb.Node;
import org.neo4j.graphdb.Relationship;
import org.neo4j.graphdb.RelationshipType;
import org.neo4j.graphdb.ReturnableEvaluator;
import org.neo4j.graphdb.StopEvaluator;
import org.neo4j.graphdb.Transaction;
import org.neo4j.graphdb.Traverser;
import org.neo4j.graphdb.Traverser.Order;
import org.neo4j.kernel.EmbeddedGraphDatabase;
import org.neo4j.index.IndexService;
import org.neo4j.index.lucene.LuceneIndexService;

import java.util.Map;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;



public class Neo4jStorage implements Storage {

    private final GraphDatabaseService graphDb;
    private final IndexService index;

    private enum RelType implements RelationshipType {
        TOPIC_TYPE, DATA_FIELD, INSTANCE
    }

    public Neo4jStorage(String dbPath) {
        System.out.println("### Neo4j: creating storage and indexer");
        graphDb = new EmbeddedGraphDatabase(dbPath);
        index = new LuceneIndexService(graphDb);
    }

    // *** Storage implementation ***

    public Topic getTopic(long id) {
        Map properties = null;
        String typeId = null;
        Transaction tx = graphDb.beginTx();
        try {
            System.out.println("### Neo4j: getting node " + id);
            Node node = graphDb.getNodeById(id);
            typeId = (String) getNodeType(node).getProperty("type_id");
            properties = getNodeProperties(node);
            //
            tx.success();   
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            return new Topic(id, typeId, properties);
        }
    }

    public Topic createTopic(String typeId, Map properties) {
        Node node = null;
        Transaction tx = graphDb.beginTx();
        try {
            node = graphDb.createNode();
            System.out.println("### Neo4j: creating node, ID=" + node.getId());
            //
            setNodeType(node, typeId);
            setNodeProperties(node, properties);
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            return new Topic(node.getId(), typeId, properties);
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

    public Association createAssociation(long src_topicId, long dst_topicId, String typeId, Map properties) {
        return null;
    }

    public void createTopicType(Map<String, String> properties, List<Map> fieldDefinitions) {
        Transaction tx = graphDb.beginTx();
        try {
            Node type = graphDb.createNode();
            String typeId = properties.get("type_id");
            System.out.println("### Neo4j: creating topic type \"" + typeId + "\", ID=" + type.getId());
            setNodeProperties(type, properties);
            index.index(type, "type_id", typeId);
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

    public boolean topicTypeExists(String typeId) {
        boolean exists = false;
        Transaction tx = graphDb.beginTx();
        try {
            exists = getNodeType(typeId) != null;
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            return exists;
        }
    }

    public void shutdown() {
        System.out.println("### Neo4j: shutting down storage and indexer");
        graphDb.shutdown();
        index.shutdown();
    }

    // *** Private Helpers ***

    // --- Properties ---

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

    // --- Types ---

    private Node getNodeType(String typeId) {
        return index.getSingleNode("type_id", typeId);
    }

    private Node getNodeType(Node node) {
        Traverser traverser = node.traverse(Order.BREADTH_FIRST,
            StopEvaluator.DEPTH_ONE, ReturnableEvaluator.ALL_BUT_START_NODE,
            RelType.INSTANCE, Direction.INCOMING);
        Iterator<Node> i = traverser.iterator();
        Node type = i.next();
        assert !i.hasNext() : node;
        return type;
    }

    private void setNodeType(Node node, String typeId) {
        Node type = getNodeType(typeId);
        assert type != null : typeId;
        type.createRelationshipTo(node, RelType.INSTANCE);
    }
}
