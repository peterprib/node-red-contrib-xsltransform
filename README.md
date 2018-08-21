node-red-contrib-xsltransform
=============================


[Node-Red][1] node to translate xml content using [xslt-processor][2].

This node transforms the xml content in msg.payload is valid according the xsl schema provided.
The xsl can be provided or a provided xsl utilised.
Cached xsl can be maintained and name provided in topic in msg or tranform node set to a specific xsl.

#Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-xsltransform


#Author

[Peter Prib][3]


[1]:http://nodered.org
[2]:https://www.npmjs.com/package/xslt-processor
[3]:https://github.com/peterprib
