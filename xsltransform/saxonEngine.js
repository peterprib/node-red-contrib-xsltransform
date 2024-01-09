const path = require('path');
const { transform } = require('saxon-js')
//const { execFile } = require('node:child_process');
const spawnCommand=require('./spawnCommand')
const { access, constants, copyFile, readdir, readFile, rm, writeFile } = require('node:fs');
const errorFunctionBase = (reason)=>{throw Error(reason)}

function saxonEngine(arg,debug) {
    Object.assign(this,{cwd:"tmp",xslDir:path.join('.','xsl')},arg)
    this.tmpDir=path.join('.',this.cwd)
    this.cache={}
    return this
}
saxonEngine.prototype.clearCache = function(done,errorFunction=errorFunctionBase){
    const _this=this
    this.cache={}
	readdir(this.tmpDir,(err,files)=>{
        _this.debug&&_this.debug({label:"clearCache",error:err,files:files})
        let fileCount=files.length,errors=[]
        files.forEach(fileName=>{
            const file=path.join(_this.tmpDir,fileName)
            rm(file,ex=>{
                _this.debug&&_this.debug({label:"clearCache rm ",file:file,error:ex?ex.message:null})
                if(ex) {
                    errors.push(ex.message)
                }
                if(--fileCount) return
                done && done(errors.length?errors.join():undefined)
            });
        })
	});
    return this
}
saxonEngine.prototype.removeCache = function(stylesheet,done,errorFunction=errorFunctionBase){
    this.debug && this.debug({label:"removeCache",stylesheet:stylesheet})
    delete this.cache[stylesheet]
    const xslFile=path.join(this.tmpDir,stylesheet+".xslt")
    rm(xslFile,(exXsl)=>{
        const selFile=path.join(this.tmpDir,stylesheet+".sef")
        rm(xslFile,(exSEF)=>{
            if((exXsl && exXsl.code !=="ENOENT") || (exSEF && exSEF.code!=="ENOENT")) errorFunction(exXsl?exXsl.message:"" + exSEF?" "+ exSEF.message:"")
            else done()
        });
    });
    return this
}
saxonEngine.prototype.getSEF = function(stylesheet,done,errorFunction=errorFunctionBase){
    const _this=this
    const xslFile=path.join(this.tmpDir,stylesheet+".xslt")
    copyFile(path.join(_this.xslDir,stylesheet+".xsl"),xslFile, // constants.COPYFILE_EXCL,
        (ex)=>{
            this.debug && this.debug({label:"getSEF copyfile",error:ex.message})
            if(ex /*&& ex.code!=='EEXIST'*/) errorFunction(ex.message)
            else _this.generateAndGetSEF(stylesheet,done,errorFunction)
        }
    )
    return this
}
saxonEngine.prototype.generateAndGetSEF = function(stylesheet,done,errorFunction){
    this.debug && this.debug({label:"generateAndGetSEF",stylesheet:stylesheet})
    const _this=this
   	const command = "xslt3 -xsl:"+stylesheet+".xslt -export:"+stylesheet+".sef -nogo -t"
    if(!errorFunction) throw Error("generateAndGetSEF no error call back")
    try{
        spawnCommand(command,
//	    exec(command,
            {cwd:this.cwd}, (error, stdout, stderr) => {
		    if (error) {
                _this.debug && this.debug({label:"generateAndGetSEF",stylesheet:stylesheet,error:ex.message})
                const ex=Error(error)
			    errorFunction(error);
			    return;
	  	    }
		    readFile(path.join(this.tmpDir,stylesheet+".sef"), (ex, data) => {
                _this.debug && this.debug({label:"generateAndGetSEF readFile",stylesheet:stylesheet,error:(ex?ex.message:null)})
		    	if (ex) {
                    errorFunction(ex.message)
                 }  else done(data)
		    })
        });
    }catch (ex) {
        errorFunction(ex.message)
    }
    return this
}
saxonEngine.prototype.setDebug = function(debug=console.log){
    this.debug=debug
    return this
}
saxonEngine.prototype.setDebugOff = function(){
    delete this.debug
    return this
}
saxonEngine.prototype.xsltToSEF = function(stylesheet,xslt,done,errorFunction=errorFunctionBase){
    const _this=this
    const file=path.join(this.tmpDir,stylesheet+".xslt")
    access(file, constants.F_OK, (err)=>{ 
        if(err) {
            writeFile(file,xslt,{encoding:'utf8',flag:'w'},(err)=>{
                if(err) errorFunction(err)
                else _this.getSEF(stylesheet,done,errorFunction)
            })
        } else errorFunction("xsl exists")

    });
    return this
}

saxonEngine.prototype.xslToSEFforce = function(stylesheet,xslt,done,errorFunction=errorFunctionBase){
    const _this=this
    if(!errorFunction) throw Error("xslToSEFforce no error call back")
    const file=path.join(this.tmpDir,stylesheet+".xslt")
    writeFile(file,xslt,{encoding:'utf8',flag:'w'},(err)=>{
        if(err) errorFunction(err)
        else _this.generateAndGetSEF(stylesheet,done,errorFunction)
    })
    return this
}
saxonEngine.prototype.xsltToSEFForce=saxonEngine.prototype.xslToSEFforce 
saxonEngine.prototype.xsltFileNameToStylesheet = (stylesheet)=>stylesheet.replace(/(\\|\/)/gm, ".")
saxonEngine.prototype.xsltFileToSEF = function(stylesheet,done,errorFunction=errorFunctionBase){
    const _this=this
	readFile(stylesheet, (err, data) => {
		if (err) errorFunction(err)
        else _this.xsltToSEFForce(_this.xsltFileNameToStylesheet(stylesheet),data,done,errorFunction)
	});
    return this
}
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
    readFile(path.join(this.tmpDir,stylesheet+".sef"), (err, data) => {
        if (err) {
            this.debug && this.debug({label:"transform no SEF file",stylesheet:stylesheet})
            readFile(path.join(this.tmpDir,stylesheet+".xslt"), (err, data) => {
                if (err) _this.getSEF(stylesheet,
                    (sef)=>_this.transformNew(xml,stylesheet,data,params,done,errorFunction),
                    errorFunction
                    )
                else {
                    this.debug && this.debug({label:"transform xslt file generateAndGetSEF",stylesheet:stylesheet})
                    _this.generateAndGetSEF(stylesheet,
                        (sef)=>_this.transformNew(xml,stylesheet,sef,params,done,errorFunction),
                        errorFunction
                    )
                }
            });
 
        } 
        else this.transformNew(xml,stylesheet,data,params,done,errorFunction)
    });
    return this
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
        else this.debug && this.debug({label:"transformNew",stylesheet:stylesheet,warning:"no stylesheetInternal"})
        done&&done(resultStringXML.principalResult)
        return resultStringXML.principalResult        
    } catch (ex) {
        if(errorFunction) errorFunction(ex.message)
        else throw ex
    }
    return this
}
module.exports = saxonEngine
