;
! function(window, document, undefined) {
    //简单的选择器正则
    var sreg = /^(?:([a-z]+)|(?:#([a-z]\w*)))$/i,
        //复杂选择器正则
        selreg = /^([a-z]+\w*)?(?:#([a-z][\w-]*))?((?:\.[a-z][\w-]*)+)?((?:\[["']?[a-z][\w-]*["']?(?:[\^\$\*\|~|\!]?=["']?[a-z][\w-]*)?["']?\])+)?(?:\:([a-z][\w-]*[a-z])(?:\((.+)\))?)?$/im,
        //层级关系正则
        tierreg = /(?!\([^\)]*)\s(?![^\(]*\))|\~(?!=)|\+|>/img,
        //首尾空格正则
        trimreg =/^\s+|\s+$/mg,
        //过滤层级关系中的多余空格正则
        blankreg = /\s*\+\s*|\s*\~\s*(?!=)|\s*>\s*/mg,
        //类获取正则
        clsreg = /\.([a-z][\w-]*)/img,
        //属性获取正则
        attrreg = /\[(?:["']?([a-z][\w-]*)["']?)(?:([\^\$\*\|~|\!]?=)["']?([a-z][\w-]*)["']?)?\]/img,
        //空格
        blank2reg = /\s+/m,
        //全局空格
        blank3reg = /\s+/mg,
        //逗号
        dotreg = /(?!\([^\)]+)\s*,\s*(?![^\(]+\))/,
        //标题元素
        headerreg = /h1|h2|h3|h4|h5|h6/i,
        //表单元素
        inputreg = /input|select|textarea|button/i;

    Array.prototype.indexOf = Array.prototype.indexOf || function(o){
        for(var i=0;i<this.length;i++){
            if(this[i] === o) return i;
        }
        return -1;
    };

    function getCurStyle(el,stylename){
        if(el.currentStyle){
            return el.currentStyle[stylename];
        }else{
            return document.defaultView.getComputedStyle(el,false)[stylename];
        }
    }

    var ap = Array.prototype,
        push = ap.push,
        slice = ap.slide,
        toStr = Object.prototype.toString;
    function isArray(o){
        return toStr.call(o).toLowerCase() === '[object array]';
    }
    function each(l,f,s){
        for(var i=0;i<l.length;i++){
            if(f.call(s,l[i],i,l)) return ;
        }
    }
    function lastEach(l,f,s){
        for(var i=l.length;--i>-1;){
            if(f.call(s,l[i],i,l)) return ;
        }
    }

    function fastQuery(selection, rootNode, ret) {
        return new fastQuery.fn.init(selection,rootNode,ret);
    }
    fastQuery.fn = fastQuery.prototype = {
        constructor: fastQuery,
        init: function(selection, rootNode, ret) {
            var d, t;
            ret = ret || [];
            rootNode = rootNode || document;
            if (d = sreg.exec(selection)) {
                if (d[1]) {
                    return push.apply(ret, rootNode.getElementsByTagName(d[1])), ret;
                } else if (d[2]) {
                    t = document.getElementById(d[2]);
                    t && ret.push(t);
                    return ret;
                }
            } else {
                if (rootNode.querySelectorAll && false) {
                    return push.apply(ret, rootNode.querySelectorAll(selection)), ret;
                } else {
                    return this.querySelectorAll(selection, rootNode);
                }
            }
        },
        querySelectorAll: function(selection, rootNode) {
            var result = [];

            var ls = this.parseMultiSelector(selection);
            each(ls,function(tiers){
                var res = this.queryNodes(tiers,rootNode);
                each(res,function(n){
                    if(result.indexOf(n) === -1){
                        result.push(n);
                    }
                },this);
            },this);
        	return result;
        },
        queryNodes:function(tiers,rootNode){
            var i,op,tier,result = rootNode;
            for(i=0;i<tiers.length;i+=2){
                op = tiers[i];
                tier = tiers[i+1];
                if(!tier) return [];
                result = this.ops[op].call(this,tier,result);
            }
            return result;
        },
        parseMultiSelector:function(sel){
            var selections = sel.split(dotreg),ls = [];
            for(var i=0;i<selections.length;i++){
                var selection = selections[i];
                var str =selection.replace(blankreg,function(a){
                    return a.replace(blank3reg,'');
                }).replace(trimreg,'').replace(blank3reg,' ');
                var sels = str.split(tierreg),
                    ops = [];
                str.replace(tierreg,function(op){
                    ops.push(op);
                });
                var tiers = [];
                for(var t=0;t<sels.length;t++){
                    tiers.push(this.parseSelector(sels[t]));
                    if(ops[t]) tiers.push(ops[t]);
                }
                tiers[0] ? tiers.unshift(' ') : tiers.shift(); 
                ls.push(tiers);
            }
            return ls;
        },
        parseSelector: function(selection) {
            if(!selection) return null;
            var m = selreg.exec(selection);
            return {
                tagname: m[1],
                id: m[2],
                cls: this.getClass(m[3]),
                attrs: this.getAttrs(m[4]),
                pseudo: m[5],
                pseudoAttr: m[6]
            }
        },
        getClass: function(str) {
            var cls = [];
            if(!str) return cls;
            str.replace(clsreg, function(a,b) {
                b.replace('.','');
            	cls.push(b);
            });
            return cls;
        },
        getAttrs: function(str) {
        	var attrs = [];
        	if(!str) return attrs;
        	str.replace(attrreg, function(a,b,c,d) {
        		attrs.push({
        			name:b,
        			op:c,
        			value:d
        		});
            });
            return attrs;
        },
        ops:{
            ' ':function(tier,rootNode){
                var i,result=[];
                isArray(rootNode) || (rootNode = [rootNode]);
                each(rootNode,function(node){
                    each(this.scanDescend(tier,node),function(v){
                        if(result.indexOf(v) === -1){
                            result.push(v);
                        }
                    })
                },this);
                return result;
            },
            '>':function(tier,rootNode){
                var i,result=[];
                isArray(rootNode) || (rootNode = [rootNode]);
                each(rootNode,function(node){
                    each(this.scanDescend(tier,node,true),function(v){
                        if(result.indexOf(v) === -1){
                            result.push(v);
                        }
                    })
                },this);
                return result;
            },
            '+':function(tier,rootNode){
                var i,result=[];
                isArray(rootNode) || (rootNode = [rootNode]);
                each(rootNode,function(node){
                    each(this.scanNextSibling(tier,node),function(v){
                        if(result.indexOf(v) === -1){
                            result.push(v);
                        }
                    })
                },this);
                return result;
            },
            '~':function(tier,rootNode){
                var i,result=[];
                isArray(rootNode) || (rootNode = [rootNode]);
                each(rootNode,function(node,i){
                    each(this.scanSiblings(tier,node),function(v){
                        if(result.indexOf(v) === -1){
                            result.push(v);
                        }
                    })
                },this);
                return result;
            }
        },

        scanDescend:function(tier,rootNode,notSub){
            var result = [];
            if(notSub){
                this.scanNode(rootNode,function(node){
                    if(this.checkTier(tier,node)){
                        result.push(node);
                    }
                });
            }else{
                var node;
                if(tier.id && rootNode.getElementById){
                    node = rootNode.getElementById(tier.id);
                    if(node && this.checkTier(tier,node)){
                        result.push(node);
                    }
                }else if(tier.cls && tier.cls.length && rootNode.getElementsByClassName){
                    node = [];
                    each(tier.cls,function(v){
                        each(rootNode.getElementsByClassName(v),function(v){
                            if(node.indexOf(v) === -1){
                                node.push(v);
                            }
                        });
                    });
                    each(node,function(v){
                        if(this.checkTier(tier,v)){
                            result.push(v);
                        }
                    },this);
                }else{
                    node = rootNode.getElementsByTagName(tier.tagname || '*');
                    if(node){
                        each(node,function(v){
                            if(this.checkTier(tier,v)){
                                result.push(v);
                            }
                        },this);
                    }
                }
            }
            return result;
        },
        scanSiblings:function(tier,rootNode){
            var result = [];
            this.scanNode(rootNode.parentNode,function(node){
                if(rootNode != node && this.checkTier(tier,node)){
                    result.push(node);
                }
            },rootNode);
            return result;
        },
        scanNextSibling:function(tier,node){
            var result = [];
            while(node = node.nextSibling){
                if(node.nodeType === 1){
                    if(this.checkTier(tier,node)) result.push(node);
                    return result;
                }
            };
            return result;
        },
        scanNode:function(parent,verifyfun,node){
            node = node || parent.firstChild;
            if(!node) return ;
            do{
                if(node.nodeType === 1)verifyfun.call(this,node);
            }while(node = node.nextSibling);
        },
        checkTier:function(tier,node){
            if(tier.id && tier.id !== node.id){
                return false;
            }
            if(tier.cls && tier.cls.length && !this.checkCls(tier.cls,node)){
                return false;
            }
            if(tier.attrs && tier.attrs.length && !this.checkAttrs(tier.attrs,node)){
                return false;
            }
            if(tier.tagname && tier.tagname.toLowerCase() !== node.nodeName.toLowerCase()){
                return false;
            }
            if(tier.pseudo && !this.checkPseudo(tier.pseudo,tier.pseudoAttr,node)){
                return false;
            }
            return true;
        },
        checkCls:function(cls,node){
            if(!node.className)return false;
            var cmap = {};
            each(node.className.split(blank2reg),function(v){
                cmap[v] = {};
            });
            for(var i=0;i<cls.length;i++){
                if(!cmap[cls[i]]) return false;
            }
            return true;
        },
        checkAttrs:function(attrs,node){
            var attr,r;
            for(var i=0;i<attrs.length;i++){
                attr = attrs[i];
                if(!attr.op){
                    r = this.getAttr(attr.name,node);
                    if(!r) return false;
                }else{
                    var op = attr.op;
                    if(!this.attrop[op]) return false;
                    r = this.attrop[op].call(this,attr.name,attr.value,node);
                    if(!r) return false;
                }
            }
            return true;
        },
        checkPseudo:function(pseudo,pseudoAttr,node){
            if(!this.pseudes[pseudo]) return false;
            return this.pseudes[pseudo].call(this,pseudo,pseudoAttr,node);
        },
        attrop:{
            '=':function(name,value,node){
                return this.getAttr(name,node) === value;
            },
            '~=':function(name,value,node){
                var nval = this.getAttr(name,node);
                if(!nval) return false;
                return RegExp('(?:^|\\s+)'+value+'(?:$|\\s+)').test(nval);
            },
            '^=':function(name,value,node){
                var nval = this.getAttr(name,node);
                if(!nval) return false;
                return RegExp('^'+value).test(nval);
            },
            '$=':function(name,value,node){
                var nval = this.getAttr(name,node);
                if(!nval) return false;
                return RegExp(value+'$').test(nval);
            },
            '*=':function(name,value,node){
                var nval = this.getAttr(name,node);
                if(!nval) return false;
                return RegExp(value).test(nval);
            },
            '|=':function(name,value,node){
                var nval = this.getAttr(name,node);
                if(!nval) return false;
                return RegExp(value+'(?:$|-)').test(nval);
            },
            '!=':function(name,value,node){
                var nval =this.getAttr(name,node);
                if(!nval) return false;
                return value !== nval;
            }
        },
        getAttr:function(name,node){
            if(name === 'class') return node.className;
            return node.getAttribute(name);
        },
        pseudes:{
            'first':function(pseudo,pseudoAttr,node){
                var first;
                each(node.parent.childNodes,function(n){
                    if(n.nodeType===1){
                        first = n;
                        return true;
                    }
                });
                return first === node; 
            },
            'last':function(){
                var last;
                each(node.parent.childNodes,function(n){
                    if(n.nodeType===1){
                        last = n;
                        return true;
                    }
                });
                return last === node;
            },
            'not':function(pseudo,param,node){
                var tier = this.parseMultiSelector(param)[0][1];
                return !this.checkTier(tier,node);
            },
            'even':function(pseudo,param,node){
                var i = 1;
                while(node = node.previousSibling){
                    if(node.nodeType === 1)i++;
                };
                return i%2 === 0;
            },
            'odd':function(pseudo,param,node){
                var i = 1;
                while(node = node.previousSibling){
                    if(node.nodeType === 1)i++;
                };
                return i%2 === 1;
            },
            'eq':function(pseudo,param,node){
                var i = 0;
                while(node = node.previousSibling){
                    if(node.nodeType === 1)i++;
                };
                if(isNaN(param)) return false;
                return i === parseInt(param);
            },
            'gt':function(pseudo,param,node){
                var i = 0;
                while(node = node.previousSibling){
                    if(node.nodeType === 1)i++;
                };
                if(isNaN(param)) return false;
                return i > parseInt(param);
            },
            'lt':function(pseudo,param,node){
                var i = 0;
                while(node = node.previousSibling){
                    if(node.nodeType === 1)i++;
                };
                if(isNaN(param)) return false;
                return i < parseInt(param);
            },
            'header':function(pseudo,param,node){
                return headerreg.test(node.nodeName);
            },
            'focus':function(pseudo,param,node){
                return document.activeElement === node;
            },
            'contains':function(pseudo,param,node){
                return node.innerText.indexOf(param) > -1;
            },
            'empty':function(pseudo,param,node){
                return !node.firstChild;
            },
            'has':function(pseudo,param,node){
                //todo
            },
            'parent':function(pseudo,param,node){
                return !!node.firstChild;
            },
            'hidden':function(pseudo,param,node){
                return getCurStyle(node,'display') === 'none';
            },
            'visible':function(pseudo,param,node){
                return getCurStyle(node,'display') !== 'none';
            },
            'nth-child':function(){

            },
            'first-child':function(){

            },
            'only-child':function(){

            },
            'input':function(pseudo,param,node){
                return inputreg.test(node.nodeName);
            },
            'text':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && (node.type === 'text' || node.type === ''); 
            },
            'password':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && node.type === 'password'; 
            },
            'radio':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && node.type === 'radio'; 
            },
            'checkbox':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && node.type === 'checkbox'; 
            },
            'submit':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && node.type === 'submit'; 
            },
            'image':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && node.type === 'image'; 
            },
            'reset':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && node.type === 'reset'; 
            },
            'button':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && node.type === 'button' || node.nodeName === 'BUTTON'; 
            },
            'file':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && node.type === 'file'; 
            },
            'hidden':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && node.type === 'hidden'; 
            },
            'enabled':function(pseudo,param,node){
                return inputreg.test(node.nodeName) && !node.disabled
            },
            'disabled':function(pseudo,param,node){
                return inputreg.test(node.nodeName) && !!node.disabled
            },
            'checked':function(pseudo,param,node){
                return node.nodeName === 'INPUT' && !!node.checked;
            },
            'selected':function(pseudo,param,node){
                return node.nodeName === 'OPTION' && !!node.selected;
            }
        }
    };
    fastQuery.fn.init.prototype = fastQuery.fn;
    window.fastQuery = fastQuery;
}(window, document);
