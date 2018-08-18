/*
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
/*eslint-disable no-use-before-define */
//var xsltProcess = require('xslt-processor').xsltProcess;
//var xmlParse = require('xslt-processor').xmlParse;
//import {xsltProcess, xmlParse} from "xslt-processor"

var libxslt = require('libxslt');
var libxmljs = libxslt.libxmljs;


module.exports = function (RED) {
    function xslParse(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        var node = this, loadCnt=0, errCnt=0;
		var xslParseCache = this.context().global.get('xslParseCache');
		if (!xslParseCache) {
	       node.log("Establish xslparse cache");
           xslParseCache={};
           node.context().global.set('xslParseCache',xslParseCache);
           require('fs').readdirSync(__dirname + '/..').forEach(function(file) {
		       node.log("file: "+file);
       		});

//  		    this.log("list xsl director: "+require('../xsl'));
/*           
           
           require('fs').readdirSync(__dirname + '/').forEach(function(file) {
  				if (file.match(/\.xsl$/) !== null) {
    				var name = file.replace('.xsl', '');
    				xslParseCache[name] = require('./' + file);
					libxslt.parse(require('./' + file), function(err, stylesheet){
						if(err) {
		   	        		this.error("loaded "+name+ " Error: "+err);
    	            		errCnt++;
						} else {
	    		        if(stylesheet===null) {
	    	    	    	if(xslParseCache.hasOwnProperty(name)) {
	    	        			delete 	xslParseCache[name];
	    	        			loadCnt--;
    	        			}
	    	        } else {
	    	        	xslParseCache[name]===stylesheet;
						this.log("loaded "+name);
		       	        loadCnt++;
    	        	}

				}
                node.status({fill:"green",shape:"ring",text:"loaded: "+loadCnt+" errors: "+errCnt});
			});
    				
  				}
			});
*/
           
        }
        node.on("input", function(msg) {
			libxslt.parse(msg.payload, function(err, stylesheet){
				if(err) {
		   	        this.error("loaded "+msg.topic+ " Error: "+err);
	                node.error(err.message,msg);
    	            errCnt++;
				} else {
	    	        if(stylesheet===null) {
	    	        	if(xslParseCache.hasOwnProperty(msg.topic)) {
	    	        		delete 	xslParseCache[msg.topic];
	    	        		loadCnt--;
    	        		}

	    	        } else {
	    	        	xslParseCache[msg.topic]===stylesheet;
						this.log("loaded "+msg.topic);
		       	        loadCnt++;
    	        	}

				}
                node.status({fill:"green",shape:"ring",text:"loaded: "+loadCnt+" errors: "+errCnt});
			});
        });                
    }
    RED.nodes.registerType("xslParse", xslParse);

    function xslTransform(config) {
        RED.nodes.createNode(this, config);
        var node = this, cnt=0, errCnt=0;
        node.name = config.name;

        if(config.xsl && config.xsl.startsWith("<")) {
			libxslt.parse(config.xsl, function(err, stylesheet){
				if(err) {
   	        		node.error("load inline xml error: "+err);
              			node.status({fill:"red",shape:"ring",text:"FAILED check log"});
				} else {
   	        		node.stylesheet=stylesheet;
					node.log("loaded inline xml");
  	        	}
			});
        } else {
   		    var xslParseCache = this.context().global.get('xslParseCache');
		    if (!xslParseCache) {
		       this.error("no parse cache");
   	    	    this.status({fill:"red",shape:"ring",text:"xsl cache empty"});
            	node.error("xsl cache not defined specified");
        	}
        }
        
        node.on("input", function(msg) {
        	var params={},stylesheet=node.stylesheet;
			if(!stylesheet) {
				try {
	            	stylesheet=xslParseCache(config.xsl||msg.xsl||msg.top);
				} catch(e) {
	            	this.status({fill:"yellow",shape:"ring",text:"processed "+(++cnt) + " errors: "+(++errCnt)});
            		node.error("processing "+(config.xsl||msg.xsl||msg.top)+" not found in cache",msg);
            		return;
            	}
			}
        	stylesheet.apply(msg.payload, params, function(err, result){
    			// err contains any error from parsing the document or applying the stylesheet
    			// result is a string containing the result of the transformation
    			if(err) {
		            node.status({fill:"yellow",shape:"ring",text:"processed "+(++cnt)+ " errors: "+(++errCnt)});
    				node.error("processing "+xslId+" error: "+err);
               		errCnt++;
    			} else {
	    			msg.payloadTransformed = result;
		            node.status({fill:"green",shape:"ring",text:"processed "+(++cnt) + " errors: "+errCnt});
					node.send(msg);
    			}

  			});  
        });
    }
    RED.nodes.registerType("xslTransform", xslTransform);

};
