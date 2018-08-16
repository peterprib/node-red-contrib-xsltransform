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

import {xsltProcess, xmlParse} from "node-red-contrib-harmony"

module.exports = function (RED) {
    var RED = require(process.env.NODE_RED_HOME+"/red/red");    

    function xslTransform(config) {
        RED.nodes.createNode(this, config);
	var xslParseCache = this.context().global.get('xslParseCache');
	if (!xslParseCache) {
   	    this.status({fill:"red",shape:"ring",text:"xsl cache empty"});
            node.error("xsl cache not defined specified");
        }
        this.name = config.name;
	if(config.xsl==null} {
              node.error("no xsl specified");
        }
        
        var node = this, cnt=0;
        node.on("input", function(msg) {
            try {
                var outXmlString = xsltProcess(xmlParse(msg.payload) , xslParseCache[msg.xsl]);
                node.send([msg,null]);
             } catch(err) {
//	      node.send([null,{ _msgid: msg._msgid, payload: result }]);
              node.error(err.message,msg);
             }
             this.status({fill:"green",shape:"ring",text:"processed "++cnt));
            });

      });                
    }
    RED.nodes.registerType("xslTransform", xslTransform);
 
    function xslParse(config) {
	var xslParseCache = this.context().global.get('xslParseCache');
	if (!xslParseCache) {
           xslParseCache={};
           this.context().global.set('xslParseCache',xslParseCache);
        }

        RED.nodes.createNode(this, config);
        this.name = config.name;
        var node = this, loadCnt=0;
        node.on("input", function(msg) {
            try {
	        xslParseCache[msg.xsl]=xmlParse(msg.payload);
             } catch(err) {
                node.error(err.message,msg);
             }
          this.status({fill:"green",shape:"ring",text:"processed "++cnt));
      });                
    }
    RED.nodes.registerType("xslParse", xslParse);

}
