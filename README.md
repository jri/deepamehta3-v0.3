
DeepaMehta 3
============

DeepaMehta is a platform for collaboration and knowledge management.  
DeepaMehta 3 is a AJAX-driven web application based on CouchDB, Lucene, and HTML Canvas.  
DeepaMehta 3 will become a complete rewrite of DeepaMehta 2 (which is Java-based).

<http://www.deepamehta.de>


Requirements
------------

* CouchDB (tested with 0.9 and 0.9.1, not yet tested with 0.10)  
  <http://couchdb.apache.org/>

* CouchApp (tested with 0.3.2 to 0.3.32, not yet tested with 0.3.4 and 0.4)  
  <http://github.com/couchapp/couchapp/>

* Python (tested with 2.4, preferred is 2.5 or later)  
  required to run CouchApp  
  <http://www.python.org/>

* couchdb-lucene (tested with 0.4)  
  <http://github.com/rnewson/couchdb-lucene/>

* Java (tested with JDK 1.4, preferred is JDK 1.5 or later)  
  required to run couchdb-lucene  
  <http://java.sun.com/>

* Git (tested with 1.6.4)  
  required for easy installation of DeepaMehta 3 and plugins  
  <http://git-scm.com/>

For Mac OS X 10.3.9 "Panther" and JDK 1.4:

* CouchDB on "Panther" installation notes:  
  <http://triumphofthenerds.blogspot.com/>

* couchdb-lucene 0.4 backport to JDK 1.4:  
  <http://github.com/jri/couchdb-lucene-jdk14/>

  There, in the Downloads section, you'll find also the Tika 0.4 backport to JDK 1.4


Installation
------------

### Preparation ###

1.  Install Python, Java, Git

2.  Install CouchDB

3.  Install CouchApp

    ** Please note:** DeepaMehta 3 has only been tested with CouchApp versions 0.3.2 to 0.3.32 so far.  
    When using the newer CouchApp versions 0.3.4 or 0.4 the DeepaMehta 3 installation procedure might differ from described here.

4.  Install couchdb-lucene

    ** Please note:** Do not install the couchdb-lucene trunk (which is 0.5 in progress and unstable).  
    Instead download the latest stable version, which is 0.4, from here:  
    <http://cloud.github.com/downloads/rnewson/couchdb-lucene/couchdb-lucene-0.4-jar-with-dependencies.jar.gz>

    IMPORTANT: Follow this unpack instruction (the usual `gunzip` won't work!):  
    <http://cloud.github.com/downloads/rnewson/couchdb-lucene/README>

5.  Configure CouchDB for use with couchdb-lucene as described in the couchdb-lucene README for version 0.4:  
    <http://github.com/rnewson/couchdb-lucene/tree/v0.4>

    (You also get there from the project's main page <http://github.com/rnewson/couchdb-lucene/> by choosing `v0.4` from the `all tags` menu.)

6.  Start CouchDB server
        sudo -u couchdb couchdb

### DeepaMehta 3 installation ###

1.  Go to the directory where you like to install DeepaMehta 3, e.g.:
        cd /usr/local

    Clone DeepaMehta 3 Git repository to your computer:
        git clone git://github.com/jri/deepamehta3.git

    A directory `deepamehta3` will be created. Go there:
        cd deepamehta3

2.  Upload DeepaMehta 3 to CouchDB:
        couchapp push --atomic http://localhost:5984/deepamehta3-db

3.  Optional: install DeepaMehta 3 plugins. For the moment there are 5 plugins available:

    <http://github.com/jri/dm3-time>  
    <http://github.com/jri/dm3-workspaces>  
    <http://github.com/jri/dm3-contacts>  
    <http://github.com/jri/dm3-email>  
    <http://github.com/jri/dm3-import>  

    See installation instructions on the respective pages.


Running
-------

Visit DeepaMehta 3 in your webbrowser:  
<http://localhost:5984/deepamehta3-db/_design/deepamehta3/index.html>


------------
Jörg Richter  
Nov 9, 2009
