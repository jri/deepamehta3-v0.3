package de.deepamehta.service;

import org.neo4j.graphdb.GraphDatabaseService;
import org.neo4j.graphdb.Node;
import org.neo4j.graphdb.Relationship;
import org.neo4j.graphdb.RelationshipType;
import org.neo4j.graphdb.Transaction;
import org.neo4j.kernel.EmbeddedGraphDatabase;

import java.util.Date;
import java.util.Set;
import java.util.HashSet;



public class DeepaMehtaService {

	public static final DeepaMehtaService DMS = new DeepaMehtaService();

	private GraphDatabaseService graphDb;

	public DeepaMehtaService() {
		System.out.println("### Creating DeepaMehtaService");
		System.out.println("### Creating Neo4j DB");
		graphDb = new EmbeddedGraphDatabase("/Users/jri/var/db/deepamehta-db-neo4j");
	}

	public Node createNode() {
		Node node = null;
		Transaction tx = graphDb.beginTx();
		try {
			node = graphDb.createNode();
			System.out.println("### Creating node, ID=" + node.getId());
			node.setProperty("message", "Hallo jri!");
			node.setProperty("count", 123);
			tx.success();
		} catch (Throwable e) {
			System.out.println("### ERROR while creating node: " + e);
		} finally {
			tx.finish();
			return node;
		}
	}

	public void shutdown() {
		graphDb.shutdown();
	}
}
