package de.deepamehta.storage.neo4j;

import de.deepamehta.core.Topic;
import de.deepamehta.core.TopicType;
import de.deepamehta.core.Relation;
import de.deepamehta.storage.Storage;

import org.neo4j.graphdb.Direction;
import org.neo4j.graphdb.GraphDatabaseService;
import org.neo4j.graphdb.Node;
import org.neo4j.graphdb.PropertyContainer;
import org.neo4j.graphdb.Relationship;
import org.neo4j.graphdb.RelationshipType;
import org.neo4j.graphdb.ReturnableEvaluator;
import org.neo4j.graphdb.StopEvaluator;
import org.neo4j.graphdb.Transaction;
import org.neo4j.graphdb.Traverser;
import org.neo4j.graphdb.Traverser.Order;
import org.neo4j.kernel.EmbeddedGraphDatabase;
import org.neo4j.index.IndexHits;
import org.neo4j.index.IndexService;
import org.neo4j.index.lucene.LuceneIndexService;
import org.neo4j.index.lucene.LuceneFulltextQueryIndexService;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;



public class Neo4jStorage implements Storage {

    private final GraphDatabaseService graphDb;
    private final IndexService index;
    private final LuceneFulltextQueryIndexService fulltextIndex;
    Map<String, TopicType> topicTypes;

    private enum RelType implements RelationshipType {
        TOPIC_TYPE, DATA_FIELD, INSTANCE,
        RELATION, SEARCH_RESULT
    }

    public Neo4jStorage(String dbPath, Map topicTypes) {
        System.out.println("  # Neo4j: creating storage and indexer");
        graphDb = new EmbeddedGraphDatabase(dbPath);
        index = new LuceneIndexService(graphDb);
        fulltextIndex = new LuceneFulltextQueryIndexService(graphDb);
        this.topicTypes = topicTypes;
    }



    // ******************************
    // *** Storage Implementation ***
    // ******************************



    // --- Topics ---

    @Override
    public Topic getTopic(long id) {
        Map properties = null;
        String typeId = null;
        Transaction tx = graphDb.beginTx();
        try {
            System.out.println("  # Neo4j: getting node " + id);
            Node node = graphDb.getNodeById(id);
            typeId = getTypeId(node);
            properties = getProperties(node);
            //
            tx.success();   
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            return new Topic(id, typeId, null, properties);     // FIXME: label remains uninitialized
        }
    }

    @Override
    public List<Topic> getRelatedTopics(long topicId, List<String> excludeRelTypes) {
        List relTopics = new ArrayList();
        Transaction tx = graphDb.beginTx();
        try {
            System.out.println("  # Neo4j: getting related nodes of node " + topicId);
            Node node = graphDb.getNodeById(topicId);
            for (Relationship rel : node.getRelationships()) {
                if (!excludeRelTypes.contains(rel.getType().name())) {
                    Node relNode = rel.getOtherNode(node);
                    relTopics.add(buildTopic(relNode));
                }
            }
            //
            tx.success();   
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            return relTopics;
        }
    }

    @Override
    public List<Topic> searchTopics(String searchTerm) {
        List result = new ArrayList();
        Transaction tx = graphDb.beginTx();
        try {
            IndexHits<Node> hits = fulltextIndex.getNodes("default", searchTerm + "*"); // FIXME: do more itelligent manipulation on the search term
            System.out.println("  # Neo4j: searching \"" + searchTerm + "\" => " + hits.size() + " nodes found");
            for (Node node : hits) {
                result.add(new Topic(node.getId(), null, null, null));  // FIXME: type, label, and properties remain uninitialized
            }
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            return result;
        }
    }

    @Override
    public Topic createTopic(String typeId, Map properties) {
        Node node = null;
        Transaction tx = graphDb.beginTx();
        try {
            node = graphDb.createNode();
            System.out.println("  # Neo4j: creating node, ID=" + node.getId());
            //
            setNodeType(node, typeId);
            setProperties(node, properties);
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            return new Topic(node.getId(), typeId, null, properties);  // FIXME: label remains uninitialized
        }
    }

    @Override
    public void setTopicProperties(long id, Map properties) {
        Transaction tx = graphDb.beginTx();
        try {
            System.out.println("  # Neo4j: setting properties of node " + id + ": " + properties.toString());
            Node node = graphDb.getNodeById(id);
            setProperties(node, properties);
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
        }
    }

    @Override
    public List deleteTopic(long id) {
        List deletedRelIds = new ArrayList();
        Transaction tx = graphDb.beginTx();
        try {
            System.out.println("  # Neo4j: deleting node " + id);
            Node node = graphDb.getNodeById(id);
            for (Relationship rel : node.getRelationships()) {
                deletedRelIds.add(rel.getId());
                rel.delete();
            }
            node.delete();
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            return deletedRelIds;
        }
    }

    // --- Relations ---

    @Override
    public Relation getRelation(long srcTopicId, long dstTopicId) {
        Relationship relationship = null;
        Transaction tx = graphDb.beginTx();
        try {
            System.out.println("  # Neo4j: getting relationship between nodes " + srcTopicId + " to " + dstTopicId);
            Node node = graphDb.getNodeById(srcTopicId);
            for (Relationship rel : node.getRelationships()) {
                Node relNode = rel.getOtherNode(node);
                if (relNode.getId() == dstTopicId) {
                    relationship = rel;
                    break;
                }
            }
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            if (relationship != null) {
                System.out.println("  # Neo4j: => relationship found (ID=" + relationship.getId() + ")");
                return new Relation(relationship.getId(), null, srcTopicId, dstTopicId, null);  // FIXME: typeId and properties remain uninitialized
            }
            System.out.println("  # Neo4j: => no such relationship");
            return null;
        }
    }

    @Override
    public Relation createRelation(String typeId, long srcTopicId, long dstTopicId, Map properties) {
        Relationship relationship = null;
        Transaction tx = graphDb.beginTx();
        try {
            System.out.println("  # Neo4j: creating relationship from node " + srcTopicId + " to " + dstTopicId);
            Node srcNode = graphDb.getNodeById(srcTopicId);
            Node dstNode = graphDb.getNodeById(dstTopicId);
            relationship = srcNode.createRelationshipTo(dstNode, RelType.valueOf(typeId));
            //
            setProperties(relationship, properties);
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
            if (relationship != null) {
                return new Relation(relationship.getId(), typeId, srcTopicId, dstTopicId, properties);
            }
            System.out.println("  # Neo4j: ERROR: relationship type \"" + typeId + "\" not declared");
            return null;
        }
    }

    @Override
    public void deleteRelation(long id) {
        Transaction tx = graphDb.beginTx();
        try {
            System.out.println("  # Neo4j: deleting relationship " + id);
            graphDb.getRelationshipById(id).delete();
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
        }
    }

    // --- Types ---

    @Override
    public void createTopicType(Map<String, Object> properties, List<Map> dataFields) {
        Transaction tx = graphDb.beginTx();
        try {
            Node type = graphDb.createNode();
            Object typeId = properties.get("type_id");
            System.out.println("  # Neo4j: creating topic type \"" + typeId + "\", ID=" + type.getId());
            setProperties(type, properties);
            index.index(type, "type_id", typeId);
            graphDb.getReferenceNode().createRelationshipTo(type, RelType.TOPIC_TYPE);
            //
            for (Map dataField : dataFields) {
                Node dataFieldNode = graphDb.createNode();
                setProperties(dataFieldNode, dataField);
                type.createRelationshipTo(dataFieldNode, RelType.DATA_FIELD);
            }
            //
            tx.success();
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            tx.finish();
        }
    }

    @Override
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

    // --- Misc ---

    @Override
    public void shutdown() {
        System.out.println("  # Neo4j: shutting down storage and indexer");
        graphDb.shutdown();
        index.shutdown();
    }



    // ***********************
    // *** Private Helpers ***
    // ***********************



    // --- Topics ---

    private Topic buildTopic(Node node) {
        String typeId = getTypeId(node);
        // label
        String label;
        TopicType topicType = topicTypes.get(typeId);
        String typeLabelField = topicType.getProperty("type_label_field");
        if (typeLabelField != null) {
            throw new RuntimeException("not yet implemented");
        } else {
            String fieldId = topicType.getDataField(0).get("field_id");
            label = (String) node.getProperty(fieldId);
        }
        //
        return new Topic(node.getId(), typeId, label, null);    // FIXME: properties remain uninitialized
    }

    private String getTypeId(Node node) {
        //
        if (node.getProperty("type_id", null) != null) {        // FIXME: recognize a type by incoming TOPIC_TYPE relation
            return "Topic Type";
        }
        //
        return (String) getNodeType(node).getProperty("type_id");
    }

    // --- Properties ---

    private Map getProperties(PropertyContainer container) {
        Map properties = new HashMap();
        for (String key : container.getPropertyKeys()) {
            properties.put(key, container.getProperty(key));
        }
        return properties;
    }

    private void setProperties(PropertyContainer container, Map<String, Object> properties) {
        if (properties == null) {
            throw new NullPointerException("setProperties() called with properties=null");
        }
        for (String key : properties.keySet()) {
            Object value = properties.get(key);
            container.setProperty(key, value);
            // fulltext index
            if (container instanceof Node) {
                fulltextIndex.index((Node) container, "default", value);
            }
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
        assert i.hasNext() : node;
        Node type = i.next();
        assert !i.hasNext() : node;
        return type;
    }

    private void setNodeType(Node node, String typeId) {
        Node type = getNodeType(typeId);
        assert type != null : "Topic type \"" + typeId + "\" not found in DB";
        type.createRelationshipTo(node, RelType.INSTANCE);
    }
}
