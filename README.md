node-red-contrib-xsltransform
=============================


[Node-Red][1] node to validate xml content using [xslt-processor][2].

This node transforms the xml content in msg.payload is valid according the xsl schema provided. The xml content is redirect to one of the 1 output available based on transformed results. The 2rd output outputs only xml validation error messages.

#Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-xsltransform


#Author

[Peter Prib][3]


[1]:http://nodered.org
[2]:https://www.npmjs.com/package/xslt-processor
[3]:https://github.com/peterprib
