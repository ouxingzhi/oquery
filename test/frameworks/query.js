/*
query selector version 1.0
Copyright 2010
Dual licensed under the MIT or GPL Version 2 licenses.
author "司徒正美(zhongqincheng)"
http://code.google.com/p/bloghighlighter/
http://www.cnblogs.com/rubylouvre/
*/
(function(window,undefined){
    //****************************************************************
    var is = function (obj,type) {
        return String(toString.call(obj)).slice(8,-1) === type;
    };
    var fn = "prototype";
    var toString =  Object[fn].toString;
    var slice = Array[fn].slice;
    window.dom = {
        doc      : window.document,
        ie       : !-[1,],
        uuid     : 0,
        quickTag : false,
        isNot    : false
    }
    dom.trim = function(str){
        str = str.replace(/^(\s|\u00A0)+/, '');
        for (var i = str.length - 1; i >= 0; i--) {
            if (/\S/.test(str.charAt(i))) {
                str = str.substring(0, i + 1);
                break;
            }
        }
        return str;
    };
    //由于IE5.5中的DOM实现错误，document.documentElement会返回body标签
    dom.htm = dom.doc.documentElement || dom.doc.getElementsByTagName("html")[0];
    var nextEl = (function(){
        return "nextElementSibling" in dom.htm ?
        "nextElementSibling" : "nextSibling";
    })();
    var prepareQuery = function(doc){
        var els = doc.all || doc.getElementsByTagName("*"),el,ri=0,comments = [],i=0,j=0;
        while((el = els[i++])){
            switch(el.nodeType){
                case 1 :
                    el.uuid = "dom-"+dom.uuid++;break
                case 8:
                    comments[ri++] = el;break;
            }
        }
        while ( (el = comments[j++]) ) { 
            el.parentNode.removeChild(el);
        }
    }
    var dd = dom.doc;
    if (dd.addEventListener) {
        dd.addEventListener( "DOMContentLoaded", function(){
            prepareQuery(dd);
        }, false );
    }else{
        if (dd.getElementById) {
            dd.write("<script id=\"ie-domReady\" defer='defer'src=\"//:\"><\/script>");
            dd.getElementById("ie-domReady").onreadystatechange = function() {
                if (this.readyState === "complete") {
                    prepareQuery(dd);
                    this.onreadystatechange = null;
                    this.parentNode.removeChild(this);
                }
            };
        }
    }

    //用于获取选择器的类型
    var types = {
        "#":"id",        //ID选择器
        ".":"class",     //类选择器
        /*"tag";         //标签选择器*/
        "[":"attribute", //属性选择器
        " ":"descendant",//关系选择器（后代选择器）
        ">":"child",     //关系选择器（亲子选择器）
        "+":"adjacent",  //关系选择器（相邻选择器）
        "~":"general",   //关系选择器（兄长选择器）
        ":":"pseudo",    //伪类选择器
        ",":"combine",   //联合选择器
        "*":"wildcard"   //通配符选择器
    }
    //用于移除相应的选择器
    var regexes = {
        id: /#((?:[\w\u00c0-\uFFFF_-]|\\.)+)/,      //ID选择器
        tag: /^((?:[\w\u00c0-\uFFFF\*_-]|\\.)+)/,   //标签选择器
        attribute: /\[((?:[\w\u00c0-\uFFFF_-]|\\.)+)\s*(?:(\S?=)(['"]*)(.*?)\3|)\]/, //属性选择器
        "class": /\.((?:[\w\u00c0-\uFFFF_-]|\\.)+)/,//类选择器
        pseudo: /:((?:[\w\u00c0-\uFFFF_-]|\\.)+)(?:\((['"]*)((?:\([^\)]+\)|[^\2\(\)]*)+)\2\))?/, //伪类选择器
        combine: /,/,                               //联合选择器
        child:/^(\>)\s*(\w*|\*)/,                    //亲子选择器
        adjacent:/^(\+)\s*(\w*|\*)/,                 //相邻选择器
        general:/^(\~)\s*(\w*|\*)/,                  //兄长选择器
        descendant:/(\s+)(\.([\w_-]+))?/,            //后代选择器
        wildcard :/\*/                               //通配符选择器
    };

    var processWildcard = function (root) {//获得页面上所有元素
        var _slice = slice,all =  root.all || root.getElementsByTagName("*"),
        i = 0,result=[],ri=0,el;
        if(dom.ie){
            while((el = all[i++])){
                if(el.nodeType === 1)
                    result[ri++] = el;
            }
            return result;
        }else{
            return _slice.call(all);
        }
    };

    var sortOrder = (dom.ie) ?  function (a, b) {
        return (a.sourceIndex - b.sourceIndex);
    }:function (a, b) {
        return (3 - (a.compareDocumentPosition(b) & 6));
    };

    var processTag = function(tagName, lastResult, root){
        var result = [],ri = 0, n = lastResult.length,
        uniqResult = {};
        if (n === 0) {
            if(tagName === "BODY")
                return [root.body];
            if (dom.ie) {
                var els = root.getElementsByTagName(tagName),
                i = els.length;
                while (i)
                    result[--i] = els[i];
                return result;
            }
            return slice.call(root.getElementsByTagName(tagName));
        } else {
            var k = 0,el;
            if(dom.quickTag){
                dom.quickTag = false;
                while((el = lastResult[k++])){
                    var nodes = el.getElementsByTagName(tagName),j = 0 ,node;
                    while((node = nodes[j++])){
                        var uid = node.uuid || (node.uuid = "dom-"+dom.uuid++)
                        if(uniqResult[uid] !== node){
                            result[ri++] = uniqResult[uid] = node;
                        }
                    }
                }
                return result;
            }else{
                while((el = lastResult[k++])){
                    if(el.nodeName === tagName)
                        result[ri++] = el;
                }
                return result;
            }
        }
    }
    //http://www.cnblogs.com/rubylouvre/archive/2009/11/25/1610044.html
    dom.getElementById = function (id, root) {
        var el = root.getElementById(id), i = 0, result = [], ri = 0;
        if (dom.ie) {
            if (el && el.attributes['id'].value === id) {
                return [el]
            } else {
                var all = root.all[id];
                while((el = all[i++])){
                    if(el.attributes['id'].value === id)
                        result[ri++] = el;
                }
                return result;
            }
        }
        return el && [el] || []
    };

    var processClass = function (className, lastResult, root) {
        var result = [],ri = 0,i = 0,el,
        reg =  new RegExp('(?:^|[ \\t\\r\\n\\f])' + className + '(?:$|[ \\t\\r\\n\\f])');
        if (lastResult.length === 0) {
            if (root.getElementsByClassName) {
                return slice.call(root.getElementsByClassName(className));
            } else {
                var els = root.all || root.getElementsByTagName("*");
                while((el = els[i++])){
                    if(reg.test(el.className || el.getAttribute("class")))
                        result[ri++] = el;
                }
                return result;
            }
        } else {
            while((el = lastResult[i++])){
                if(reg.test(el.className || el.getAttribute("class")) ^ dom.isNot)
                    result[ri++] = el;
            }
            return result;
        }
    }
    var processDescendant = function(className,lastResult, root){//后代选择器
        var result = [],ri = 0,isAll = !className.length ,
        uniqResult = {}, i = 0 ,el, reg;
        if(!isAll){
            reg =  new RegExp('(?:^|[ \\t\\r\\n\\f])' + className + '(?:$|[ \\t\\r\\n\\f])');
        }
        lastResult = lastResult.sort(sortOrder);
        if(!isAll && root.getElementsByClassName){
            while((el = lastResult[i++])){
                var nodes = el.getElementsByClassName(className);
                var node ,j =0;
                while((node = nodes[j++])){
                    var uid = node.uuid || (node.uuid = "dom-"+dom.uuid++);
                    if(uniqResult[uid] !== node){
                        result[ri++] = uniqResult[uid] = node;
                    }
                }
            }
        }else{
            while((el = lastResult[i++])){
                if(uniqResult[el.uuid] !== el){
                    var elems = el.all || el.getElementsByTagName("*");
                    var elem, k = 0
                    while((elem = elems[k++])){
                        if(uniqResult[elem.uuid] === elem) break;
                        if(elem.nodeType === 1 && (isAll || reg.test(elem.className || elem.getAttribute("class")))){
                            var _uid = elem.uuid || (elem.uuid = "dom-"+dom.uuid++);
                            if(uniqResult[_uid] === elem){
                                break;
                            }else{
                                result[ri++] = uniqResult[_uid] = elem;
                            }
                        }
                    }
                }
            }
        }
        return result;
    };
    var processChild = function (nodeName,lastResult) {//亲子选择器
        var tagName = nodeName.toUpperCase() || "*",
        result = [],ri = 0,isAll = tagName === "*",el,i=0;
        while((el = lastResult[i++])){
            var nodes = el.childNodes;
            for(var j = 0, node; node = nodes[j]; j++)
                if(node.nodeType === 1 &&(isAll || tagName === node.nodeName))
                    result[ri++] = node;
        }
        return result;
    };

    var processGeneral = function (nodeName,lastResult) {//兄长选择器
        var tagName = nodeName.toUpperCase() || "*",_nextEl = nextEl,
        isAll = tagName === "*", result = [],ri = 0, uniqResult = {}, i = 0, node;
        while((node = lastResult[i++])){
            if(uniqResult[node.uuid] !== node){
                while ((node = node[_nextEl])){
                    if(uniqResult[node.uuid] === node) break;
                    if(node.nodeType === 1 && (isAll || tagName === node.nodeName)){
                        var uid = node.uuid || (node.uuid = "dom-"+dom.uuid++)
                        if(uniqResult[uid]){
                            break;
                        }else{
                            result[ri++] = uniqResult[uid] = node;
                        }
                    }
                }
            }
        }
        return result;
    };

    var processAdjacent = function (nodeName,lastResult) { //相邻选择器
        var tagName = nodeName.toUpperCase() || "*",_nextEl = nextEl,
        result = [],ri=0,isAll = tagName === "*",i = 0, node;
        while((node = lastResult[i++])){
            while((node = node[_nextEl])){
                if(node.nodeType === 1){
                    if (isAll || tagName === node.nodeName)
                        result[ri++] = node;
                    break;
                }
            }
        }
        return result;
    };

    var fixAttributs = {
        "accept-charset": "acceptCharset",
        accesskey: "accessKey",
        bgcolor: "bgColor",
        cellpadding: "cellPadding",
        cellspacing: "cellSpacing",
        "char": "ch",
        charoff: "chOff",
        "class": "className",
        codebase: "codeBase",
        codetype: "codeType",
        colspan: "colSpan",
        datetime: "dateTime",
        defaultchecked:"defaultChecked",
        defaultselected:"defaultSelected",
        defaultvalue:"defaultValue",
        "for": "htmlFor",
        frameborder: "frameBorder",
        "http-equiv": "httpEquiv",
        ismap: "isMap",
        longdesc: "longDesc",
        maxlength: "maxLength",
        marginwidth:"marginWidth",
        marginheight:'marginHeight',
        nohref: "noHref",
        noresize:"noResize",
        noshade: "noShade",
        readonly: "readOnly",
        rowspan: "rowSpan",
        tabindex: "tabIndex",
        usemap: "useMap",
        vspace: "vSpace",
        valuetype: "valueType"
    };

    var fastGetAttribute = function(el,name){
        var special = fixAttributs[name];
        if(special)
            return el[special];
        var flag = /^(?:src|href|action)$/.test(name) ? 2 : 0;
        return el.getAttribute(name,flag) || el[name];
    };

    var processAttribute = function (name,operator,value,lastResult, root) { //属性选择器
        if(lastResult.length === 0)
            lastResult = processWildcard(root);
        var result = [],ri = 0,reg;
        switch (operator) {
            case '$=':reg =  new RegExp(   value + '$' );break ;
            case '~=':reg =  new RegExp(  '(?:^|[ \\t\\r\\n\\f])' + value + '(?:$|[ \\t\\r\\n\\f])');break;
            case '|=':reg =  new RegExp(  '(?:^|\\|)' + value + '(?:$|\\|)');break;
        }
        var el , i = 0 ,isNot = dom.isNot;
        while((el = lastResult[i++])){
            var attrib = fastGetAttribute(el, name),//取得元素的实际属性值
            flag = (attrib != null) && (attrib !== "");
            if(flag && operator)
                switch (operator) {
                    case '=':  flag =  attrib === value ;break ;
                    case '!=': flag =  attrib !== value ;break ;
                    case '^=': flag =  attrib.indexOf(value) === 0 ;break ;
                    case '*=': flag =  attrib.indexOf(value) !== -1 ;break ;
                    default :  flag =  reg.test(attrib);break;
                }
            if (!!flag  ^ isNot)
                result[ri++] = el;
        }
        return result;
    }

    var processPseudoHasExp = function(_pointer,_sibling,_noCheck){
        return {
            curry :function(lastResult,args){
                var result = [],ri = 0, uniqResult = {},els = lastResult,a = args.a,b = args.b,
                pointer = _pointer,sibling = _sibling,isAll = _noCheck;
                for (var i = 0, el; el = els[i]; ++i) {
                    var uid = el.uuid || (el.uuid = "dom-"+ dom.uuid++), find = uniqResult[uid];
                    if (find === void 0) {
                        for (var c = 0, node = el.parentNode[pointer], tagName = !!isAll || el.nodeName;node; node = node[sibling])
                            if (node.nodeType === 1 && (isAll || tagName === node.nodeName)) {
                                ++c;
                                uniqResult[node.uuid || (node.uuid = "dom-"+ dom.uuid++)] = a === 0 ? c === b : (c - b) % a === 0 && (c - b) / a >= 0;
                            }
                        find = uniqResult[uid];
                    }
                    if (find ^ dom.isNot)
                        result[ri++] = el;
                }
                return result;
            }
        }
    }

    var processPseudoNoExp = function(_direction,_noCheck){
        return {
            curry : function(lastResult){
                var result = [],ri = 0,els = lastResult,direction = _direction,isAll = _noCheck;
                for (var i = 0, el; el = els[i]; i++) {
                    var tagName = isAll || el.nodeName, find = null
                    if (find === null && direction <= 0){
                        for (var node = el.previousSibling; node; node = node.previousSibling)
                            if (node.nodeType === 1 && (isAll || node.nodeName === tagName)) {
                                find = false;
                                break;
                            }
                    }
                    if (find === null && direction >= 0)
                        for (var node = el.nextSibling; node; node = node.nextSibling)
                            if (node.nodeType === 1 && (isAll || node.nodeName === tagName)) {
                                find = false;
                                break;
                            }
                    if (find === null)
                        find = true;
                    if (find ^ dom.isNot)
                        result[ri++] = el;
                }
                return result;
            }
        }
    }

    var filters = { //伪类选择器的过滤器
        enabled: function(el){//标准
            return el.disabled === false && el.type !== "hidden";
        },
        disabled: function(el){//标准
            return el.disabled === true;
        },
        checked: function(el){//标准
            return el.checked === true;
        },
        indeterminate:function(el){//标准
            return el.indeterminate = true && el.type === "checkbox"
        },
        selected: function(el){
            el.parentNode.selectedIndex;
            return el.selected === true;
        },
        empty: function (el) {//标准
            return !el.firstChild;
        },
        lang: function (el, value) {//标准
            var reg = new RegExp("^" + value, "i")
            while (el && !el.getAttribute("lang"))
                el = el.parentNode;
            return  !!(el && reg.test(el.getAttribute("lang")));
        },
        header: function(el){
            return /h\d/i.test( el.nodeName );
        },
        text: function(el){
            return "text" === el.type;
        },
        radio: function(el){
            return "radio" === el.type;
        },
        checkbox: function(el){
            return "checkbox" === el.type;
        },
        file: function(el){
            return "file" === el.type;
        },
        password: function(el){
            return "password" === el.type;
        },
        submit: function(el){
            return "submit" === el.type;
        },
        image: function(el){
            return "image" === el.type;
        },
        reset: function(el){
            return "reset" === el.type;
        },
        button: function(el){
            return "button" === el.type || el.nodeName.toLowerCase() === "button";
        },
        input: function(el){
            return /input|select|textarea|button/i.test(el.nodeName);
        },
        hidden : function( el ) {
            return el.type === "hidden" || el.style.display === "none";
        },
        visible : function( el ) {
            return el.type !== "hidden" && el.style.display !== "none";
        },
        link:function(el){
            return el.nodeName === "A";
        },
        root:function(el){//标准
            return el ===  (el.ownerDocument || el.document).documentElement;
        },
        target:function(el,_,root){//标准
            var id = root.location.hash.slice(1);
            return el.id === id || el.name === id;
        },
        parent : function( el ) {
            return !!el.firstChild;
        },
        contains: function(el, exp) {
            return (el.textContent||el.innerText||'').indexOf(exp) !== -1
        },
        "first-child":      processPseudoNoExp(-1, true),//标准
        "last-child":       processPseudoNoExp( 1, true),//标准
        "only-child":       processPseudoNoExp( 0, true),//标准
        "first-of-type":    processPseudoNoExp(-1, false),//标准
        "last-of-type":     processPseudoNoExp( 1, false),//标准
        "only-of-type":     processPseudoNoExp( 0 ,false),//标准
        "nth-child":        processPseudoHasExp("firstChild", "nextSibling",     true),//标准
        "nth-last-child":   processPseudoHasExp("lastChild",  "previousSibling", true),//标准
        "nth-of-type":      processPseudoHasExp("firstChild", "nextSibling",     false),//标准
        "nth-last-of-type": processPseudoHasExp("lastChild",  "previousSibling", false)//标准
    };

    var processNth = function (exp) {
        var match = /(-?)(\d*)n([-+]?\d*)/.exec(exp === "even" && "2n" || exp === "odd" && "2n+1" || !/\D/.test(exp) && "0n+" + exp || exp);
        return {
            a: (match[1] + (match[2] || 1)) - 0,
            b: match[3] - 0
        };
    };
    var processPseudo = function (arr,lastResult, root){//伪类选择器
        var type = arr[1], exp= arr[3] ;
        if(lastResult.length === 0 )
            lastResult = processWildcard(root);

        var typeConvert = {
            nth: "nth-child(" + exp + ")",
            eq: "nth-child(" + exp + ")",
            lt: "nth-child(-n+" + (+exp - 1) + ")",
            gt: "nth-child(n+" + (+exp + 1 )+ ")",
            first: "nth-child(1)",
            last: "nth-last-child(1)",
            odd: "nth-child(odd)",
            even: "nth-child(even)",
            only: "only-child"
        }
        if(typeConvert[type]){
            arr = (":"+typeConvert[type]).match(regexes.pseudo);
            type = arr[1], exp= arr[3];
        }
        var filter = filters[type], i = 0,result = [],ri = 0,el,isNot = dom.isNot;
        if(is(filter,"Object") && is(filter.curry,"Function")){
            return filter.curry(lastResult,processNth(exp),isNot);
        }
        //处理target root checked disabled empty enabled lang 等伪类
        while(el = lastResult[i++]){
            if(filter(el, exp, root) ^ isNot)
                result[ri++] = el;
        }
        return result;
    };

    //适配器，根据选择器的类型调用相应的函数去处理
    var dispatcher = {
        wildcard:function(segment,lastResult,root){    //通配符选择器
            return dom.isNot ? [] : processWildcard(root);
        },
        tag : function(segment,lastResult,root){       //标签选择器
            return processTag(segment.toUpperCase(), lastResult, root);
        },
        id : function(segment, lastResult, root){        //ID选择器
            var identifier = segment.slice(1);
            return  dom.isNot ? processAttribute("id","=",identifier,lastResult ,root):
            dom.getElementById(identifier, root) ;
        },
        "class":function(segment, lastResult, root){     //类选择器
            var className = segment.slice(1);
            return dom.isNot ? processAttribute("class","~=",className,lastResult, root):
            processClass(className, lastResult, root);
        },
        descendant:function(segment, lastResult, root){ //后代选择器(第一个参数为className)
            return processDescendant(segment.match(regexes.descendant)[3], lastResult, root);
        },
        child:function(segment, lastResult){       //亲子选择器(第一个参数为tagsName)
            return processChild(segment.match(regexes.child)[2],lastResult);
        },
        general:function(segment, lastResult){    //兄长选择器(第一个参数为tagsName)
            return processGeneral(segment.match(regexes.general)[2],lastResult);
        },
        adjacent:function(segment, lastResult){   //相邻选择器(第一个参数为tagsName)
            return processAdjacent(segment.match(regexes.adjacent)[2],lastResult)
        },
        attribute:function(segment, lastResult, root){ //属性选择器
            var arr = segment.match(regexes.attribute);
            return processAttribute(arr[1],arr[2], arr[4],lastResult, root);
        },
        pseudo:function(segment, lastResult, root){      //伪类选择器
            return  processPseudo(segment.match(regexes.pseudo), lastResult, root);
        }
    }

    dom.query = function (selectors, lastResult) {
        lastResult = lastResult || [];
        var result = [],
        root = dom.doc,
        isRelationAndTag= {
            "adjacent":1,
            "general":1,
            "child":1,
            "descendant":1,
            "tag":1
        },
        removeBlank = /\s*([>,\+\~=])\s*(?=(?:(?:[^"']*"[^"']*){2}|(?:[^"']*'[^"']*){2})*[^"']*$)/g;
        selectors = selectors.replace(removeBlank, function ($1, $2) {
            return $2;
        });
        selectors = dom.trim(selectors);
        if(root.querySelectorAll){
            try{
                var els = root.querySelectorAll(selectors),ri = 0;
                if(dom.ie){
                    for(var i=0,n=els.length;i<n;i++)
                        if(els[i].nodeType === 1)
                            result[ri++] =els[i]
                    return result;
                }else{
                    return slice.call(els);
                }
            }catch(e){}
        }
        while (selectors.length) {
            var type = types[selectors.charAt(0)] || "tag",
            regex = regexes[type],
            segment = selectors.match(regex)[0];
            selectors = selectors.replace(segment, '');

            if(lastResult.length && type === "descendant" && /[a-z0-9A-Z_]/.test(selectors.charAt(0))){
                dom.quickTag = true;
                continue;
            }

            if(type === "combine") {
                result = result.concat(lastResult);
                lastResult = [];
                continue;
            } else if(isRelationAndTag[type] && selectors.charAt(0) === "#"){
                continue;
            }else if(segment.slice(0,4) === ":not"){
                var add = segment.match(regexes.pseudo)[3] || "";
                selectors = add + selectors + ":yes()";
                dom.isNot = true;
                continue;
            }else if(segment.slice(0,4) === ":yes"){
                dom.isNot = false;
                continue;
            }

            lastResult = dispatcher[type](segment, lastResult, root);

            if (lastResult === undefined || lastResult.length === 0) {
                break;
            }
        }
        return result.concat(lastResult);
    }
})(window);