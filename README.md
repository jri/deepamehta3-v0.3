
DeepaMehta 3
============

DeepaMehta is a platform for collaboration and knowledge management.  
DeepaMehta 3 is a AJAX-driven web application based on CouchDB, Lucene, and HTML Canvas.  
DeepaMehta 3 will become a complete rewrite of DeepaMehta 2 (which is Java-based).

<http://www.deepamehta.de>


Requirements
------------

* CouchDB (tested with 0.9)  
  <http://couchdb.apache.org/>

* CouchApp  
  <http://github.com/couchapp/couchapp>

* Python 2.5 or later (required to run CouchApp)

* couchdb-lucene (tested with 0.4)  
  <http://github.com/rnewson/couchdb-lucene/>

For Mac OS X 10.3.9 ("Panther") and JDK 1.4:

* CouchDB on "Panther" installation notes:  
  <http://triumphofthenerds.blogspot.com/>

* couchdb-lucene 0.4 backport to JDK 1.4:  
  <http://github.com/jri/couchdb-lucene-jdk14/>

  There, in the Downloads section, you'll find also the Tika 0.4 backport to JDK 1.4


Installation
------------

1.  Install CouchDB
2.  Install CouchApp
3.  Install couchdb-lucene
4.  Install git
5.  Clone DeepaMehta 3 git repository to your computer
        mkdir deepamehta3
        cd deepamehta3
        git clone git://github.com/jri/deepamehta3.git
6.  Start CouchDB
        sudo -u couchdb couchdb
7.  Upload DeepaMehta 3 to the CouchDB database
        couchapp push --atomic http://localhost:5984/deepamehta3-db
8.  Visit DeepaMehta 3 in your webbrowser
        http://localhost:5984/deepamehta3-db/_design/deepamehta3/index.html


------------
Jörg Richter  
16.9.2009
