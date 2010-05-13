package de.deepamehta.service;

import javax.servlet.ServletContextListener;
import javax.servlet.ServletContextEvent;



public class ServletListener implements ServletContextListener {

	public void contextInitialized(ServletContextEvent sce) {
		System.out.println("### Servlet context initialized: " + sce.getServletContext().getContextPath());
	}

	public void contextDestroyed(ServletContextEvent sce) {
		System.out.println("### Servlet context destroyed: " + sce.getServletContext().getContextPath());
		System.out.println("### Shutdown Neo4j DB");
		DeepaMehtaService.DMS.shutdown();
	}
}
