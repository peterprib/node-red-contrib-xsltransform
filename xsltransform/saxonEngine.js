const path = require('path');
const { transform } = require('saxon-js')
const { exec } = require('node:child_process');
const { access, constants, copyFile, readFile, rm, writeFile } = require('node:fs');
const errorFunctionBase = (reason)=>{throw Error(reason)}

function saxonEngine(arg,debug) {
    Object.assign(this,{cwd:"tmp",xslDir:"./xsl"},arg)
    this.cache={}
}
saxonEngine.prototype.clearCache = function(){
    this.cache={}
}
saxonEngine.prototype.removeCache = function(stylesheet,done,errorFunction=errorFunctionBase){
    delete this.cache[stylesheet]
    const xslFile=path.join(this.cwd,stylesheet+".xslt")
    rm(xslFile,(errXsl)=>{
        const selFile=path.join(this.cwd,stylesheet+".sef")
        rm(xslFile,(errSef)=>{
            if(errXsl || errSef ) errorFunction(errXsl +" "+errSef)
            else done()
        });
    });
}
saxonEngine.prototype.getSEF = function(stylesheet,done,errorFunction=errorFunctionBase){
    const _this=this
    const xslFile=path.join(this.cwd,stylesheet+".xslt")
    copyFile(path.join(_this.xslDir,stylesheet+".xsl"),xslFile, constants.COPYFILE_EXCL,(err)=>{
        this.debug && this.debug({label:"getSEF copyfile",error:err}) 
        this.generateAndGetSEF(stylesheet,done,errorFunction)
    })
}
saxonEngine.prototype.generateAndGetSEF = function(stylesheet,done,errorFunction=errorFunctionBase){
    const _this=this
   	const command = "xslt3 -xsl:"+stylesheet+".xslt -export:"+stylesheet+".sef -nogo -t"
	exec(command,{cwd:this.cwd}, (error, stdout, stderr) => {
		this.debug && this.debug({label:"getSEF exec",stdout:stdout,stderr:stderr})
		if (error) {
			errorFunction(error);
			return;
	  	}
		readFile(path.join(this.cwd,stylesheet+".sef"), (err, data) => {
			if (err) errorFunction(err)
			else done(data)
		});
	});
}
saxonEngine.prototype.xsltToSEF = function(stylesheet,xslt,done,errorFunction=errorFunctionBase){
    const _this=this
    const file=path.join(this.cwd,stylesheet+".xslt")
    access(file, constants.F_OK, (err)=>{ 
        if(err) {
            writeFile(file,xslt,{encoding:'utf8',flag:'w'},(err)=>{
                if(err) errorFunction(err)
                else _this.getSEF(stylesheet,done,errorFunction)
            })
        } else errorFunction("xsl exists")

    });
}
/*
saxonEngine.prototype.xsltToSEF = function(stylesheet,xslt,done,errorFunction=errorFunctionBase){
    const _this=this
    if(stylesheet==null) throw Error("not style sheet specified")
    const file=path.join(this.cwd,stylesheet+".xslt")
    access(file, constants.F_OK, function(err) { 
        if(err) _this.xslToSEFforce(stylesheet,xslt,done,errorFunction=errorFunctionBase)
        else errorFunction("xsl exists for "+stylesheet)
    });
}
*/
saxonEngine.prototype.xslToSEFforce = function(stylesheet,xslt,done,errorFunction=errorFunctionBase){
    const _this=this
    const file=path.join(this.cwd,stylesheet+".xslt")
    writeFile(file,xslt,{encoding:'utf8',flag:'w'},(err)=>{
        if(err) errorFunction(err)
//        else _this.getSEF(stylesheet,done,errorFunction)
        else _this.generateAndGetSEF(stylesheet,done,errorFunction)
    })
}
saxonEngine.prototype.xsltToSEFForce=saxonEngine.prototype.xslToSEFforce 
saxonEngine.prototype.xsltFileNameToStylesheet = (stylesheet)=>stylesheet.replace(/(\\|\/)/gm, ".")
saxonEngine.prototype.xsltFileToSEF = function(stylesheet,done,errorFunction=errorFunctionBase){
    const _this=this
	readFile(stylesheet, (err, data) => {
		if (err) errorFunction(err)
        else _this.xsltToSEFForce(_this.xsltFileNameToStylesheet(stylesheet),data,done,errorFunction)
	});
}
/*
saxonEngine.prototype.xsltToSEFForce = function(stylesheet,xslt,done,errorFunction=errorFunctionBase){
    const _this=this
	readFile(path.join(this.cwd,stylesheet+".sef"), (err, data) => {
		if (err) _this.getSEF(stylesheet,done,errorFunction)
        else errorFunction("SEF already exits")
	});
}
*/
saxonEngine.prototype.transform = function(xmlString,stylesheet,params,done,errorFunction=errorFunctionBase) {
    const xml= xmlString.startsWith("<")?xmlString:"<data>"+xmlString+"</data>"
    if(this.cache.hasOwnProperty(stylesheet)) {
        this.debug && this.debug({label:"transform cached",stylesheet:stylesheet})
        const resultStringXML = transform({
            stylesheetInternal: this.cache[stylesheet],
            sourceText:xml,
            destination: "serialized",
            stylesheetParams:params
        });
        done&&done(resultStringXML.principalResult )
        return resultStringXML.principalResult 
    }
    this.debug && this.debug({label:"transform new",stylesheet:stylesheet})
    const _this=this
    readFile(path.join(this.cwd,stylesheet+".sef"), (err, data) => {
        if (err) _this.getSEF(stylesheet,
            (sef)=>_this.transformNew(xml,stylesheet,data,params,done,errorFunction),
            errorFunction
            )
        else this.transformNew(xml,stylesheet,data,params,done,errorFunction)
    });
}
saxonEngine.prototype.transformNew = function(xml,stylesheet,sef,params,done,errorFunction=errorFunctionBase) {
    this.debug && this.debug({label:"transformNew",stylesheet:stylesheet})
    try{
        const resultStringXML = transform({
            stylesheetText: sef,
            sourceText: xml,
            destination: "serialized",
            stylesheetParams:params
          })
        if(resultStringXML.stylesheetInternal) this.cache[stylesheet]=resultStringXML.stylesheetInternal
        done&&done(resultStringXML.principalResult)
        return resultStringXML.principalResult        
    } catch (ex) {
        errorFunction
    }
}
module.exports = saxonEngine
