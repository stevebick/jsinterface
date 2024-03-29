﻿/*
Для замены в Dreamweaver:

\/\/[^\n\r]+[\n\r]+					-			Однострочный комментарий

\/\*\*(.|[^(\*\/)])+?\*\/			-			Многострочный комментарий

]]></command>
<command><![CDATA[

*/

/*

Переписываю полностью JS внутренности
Объекты:
 + JSI - объект хранящий функции-шорткаты+методы для доступа к главным объектам JS и прочей 'важной' инфы.
 + JSIMain - главный объект
 + JSIElement - объект для поиска флеш объектов в документе
 + JSIBrowser - объект для для быстрого доступа к основным настройкам окна и документа
 + JSIInstance - Объект создающий экземпляры объектов и вызывает методы/функции без смены областей видимости
 + JSObjects - для работы с объектами
 + JSFunctions - для работы с функциями
 + JSCallbacks - для работы с каллбеками
 + JSInclude - позволяет конкретными шорткатами грузить конкретные типы рессурсов - внедрять JS и CSS(надо подумать, что ещё грузить) и делать другие штуки с созданием тегов в контейнере <HEAD/ >.
 * FLObject - объект обёртка для переданного из флеш плеера объекта. Будет иметь стандартные методы Proxy класса - callProperty, getProperty, setProperty, hasProperty, deleteProperty
 TODO("." - DONE; "-" - REJECTED; "*" - IN PROGRESS):
 . перенести только необходимые функции
 . Добавить шорткаты с try* для отлова ошибок исполнения JS кода и callback для возврата этих ошибок во Flash, чтоб их можно было бесшумно обработать. Потом привязать все эти методы к ключу JSInterface.useExceptionHandling.
 . Добавить новый вид вызова функции callLater(obj, func, handler, time=1), которая будет вызывать func по таймауту, а резульат возвращать в хендлер.
 . К процедуре callLater нужно добавить аналог tryCallLater и такой же аналог для его анонимной функции таймаута
 - Массив параметров передаётся как массив Info объектов, нужно сделать так чтоб этот массив сам передавался как info объект, у которого в value находится массив аргументов.
 . Добавить реестр флеш объектов обёрток и возвращать уже созданную обёртку по имени флеш объекта(пусть они храняться в ассоциативном массиве Object[name] = target с ключами - именами флеш объектов). Во флеше должен быть такой же реестр, сохраняющий имена перенесённых объектов Dictionary(weak = true)[object] = name.
 . Изменить механизм ловли ошибок и сделать как в JavaScript - возвращать во флеш объект {value:*, error:*}, это позволит убрать ещё один каллбек и теперь ошибка будет выскакивать не по тику, а в момент выполнения конкретного свойства/метода.
 . Решить проблему с try{}catch(e){throw e}, чтоб ошибка не тухла в catch
 . Добавить проверку на обёртку FLSimple JS объекта, при которой любой объект содержщийся в нём будет передаваться как есть - без ссылки. А в AS надо добавить интерфейс, с методом, который возвращает простой объект для передачи и проксю для протекта от передачи напрямую обычных объектов и массивов.
 . Всех получаемых простых Объектов и Массивов сделать проверку вглюбь, на возможные вложения сложных объектов находящихся в свойствах этих объектов.
 . Прекратить создавать объекты для простых типов - они всё равно нигде не используются, но создают нагрузку.
 * Сделать проверку на простые объекты т.к. (new Number(5) instanceof Object) = true, надо исключить попадание таких объектов по ссылке.
 - Может привести к логическим парадоксам. Лучше оставить как есть - объекты будут передаваться комплексно, не зависимо от их типов.
 . Привести к нормальному виду JSI.__callFunction и добавить метод к JSIInstance для вызова функции напрямую с неизвестным кол-вом аргументов.
 . Использовать вместо JSI имени значение ID флешки, если оно задано.
 . Добавить к FLObject методы remove() и static clear() для отчистки ссылок
 - Дописать комманды, во флеше. Добавить метод forEach к FLObject'у, чтоб моно было перебирать свойства объекта с хандлером.
 . Добавить возможность создания объекта из ссылки на функцию. К примеру, так: var obj:JSDynamic = new JSDynamic(JSInterface.document.constructor);
 * Для релиза JSInterface 2 нужно создать специальный лоадер для IE, чтоб можно было юзать SWF файлы без HTML страницы.
 . Сменить хостера всех JSIMain объектов с JSI, на JSIHost и все вызовы объектов JSI[name] на JSIHost[name], соответственно.
 . Проверить почему в каллбеках не работает try.catch и перенаправить ошибку в метод заданный в JSInterface.exceptionHandler
 . Разграничить удаление созданных инстансов, для отчистки памяти: JSInterface.clear(flCallbacks, flObjects, jsCallbacks, jsObjects);FLObject.clear(flCallbacks, flObjects, jsCallbacks, jsObjects);
*/

//---------------------------------------------------------------------------------------------------- ШОРТКАТ ОБЪЕКТ
/** Cодержит шорткаты-методы выполняющие несколько комбинированых действий */
JSI = function(){};
JSIHost = {};
JSI.first;
JSI.count = 0;
/** Базовое имя создаваемых экземпляров объекта */
JSI.name = '__jsi_';
/** Индекс экземпляров объекта */
JSI.index = 0;
/** Список названий методов объекта window, которые будут вызваны при инициализации системы */
JSI.isInstalled = false;
JSI.installedEventList = ['onJSIInstalled', 'onjsiinstalled'];
//---------------------------------------------------------------------------------------------------- JSI PUBLIC
//---------------------------------------------------------------------------------------------------- JSI STATIC
/** Создать экземпляр оъекта. Возвращает ссылку на него.
 *
 * @param {String} id
 * @param {String} url
 * @return {String}
 */
JSI.create = function(id, url){
	var nm = id ? id : JSI.name+String(JSI.index++);
	var o = new JSIMain(id, url, nm);
	if(!JSI.first){
		JSI.first = o;
	};
	JSIHost[nm] = o;
	JSI.count++;
	return nm;
};
/** Получить экземпляр объекта по его ссылке
 *
 * @param {String} n
 * @return {JSIMain}
 */
JSI.get = function(n){
	var r;
	if(n){
		r = JSIHost[n];
	}else if(JSI.count==1){
		r = JSI.first;
	};
	return r;
};
/** Отчистить текущий сеанс JS
 *
 * @param {String} n
 * @param {Boolean} c Указывает на необходимость отчищать каллбеки(объекты обёртки)
 */
JSI.clear = function(n, c, o){
	JSIHost[n].clear(c, o);
};
/** Возвращает ссылку на объект document. Имя максимально укорочено, чтоб уменьшить количество символов передаваемых вExternalInterface во время фазы JavaScript injection(необходимо, чтоб символов было не больше 255)
 *
 * @return {HTMLDocument}
 */
JSI.d = function(){
	var d;
	try{
		d = window['document'];
	}catch(e){
		d = null;
	};
	return d;
};
/** Проверяет, доступен ли объект document
 *
 * @return {Boolean}
 */
JSI.hasDocument = function(){
	return Boolean(JSI.d());
};
/** Проверяет, не, ёбаный в жопу тупым предметом, осёл ли текущий браузер
 *
 * @return {Boolean}
 */
JSI.isIE = function(){
	return (navigator.appName.indexOf('Microsoft')>=0);
};
/** Индекс экземпляров объект */
JSI.onInstalled = function(){
	if(!JSI.isInstalled){
		var len = JSI.installedEventList.length;
		for(var i=0; i<len; i++){
			var e = JSI.installedEventList[i];
			if(typeof window[e]=='function'){
				window[e]();
			};
		};
		JSI.isInstalled = true;
	};
};
//----------------------------- Системные объекты
/** Получить ссылку на объект document.
 *
 * @param {String} jn
 * @return {String}
 */
JSI.getDocumentLink = function(jn){
	return JSIHost[jn].getInfo(JSI.hasDocument() ? JSI.d() : null);
};
/** Получить ссылку на объект window.
 *
 * @param {String} jn
 * @return {String}
 */
JSI.getWindowLink = function(jn){
	return JSIHost[jn].getInfo(window);
};
/** Получить ссылку на объект navigator.
 *
 * @param {String} jn
 * @return {String}
 */
JSI.getNavigatorLink = function(jn){
	return JSIHost[jn].getInfo(navigator);
};
/** Получить ссылку на объект флеш плеера.
 *
 * @param {String} jn
 * @return {String}
 */
JSI.getMainLink = function(jn){
	var j = JSIHost[jn];
	var m = j.main;
	return j.getInfo(m);
};
/** Получить ссылку на объект события.
 *
 * @param {String} jn
 * @return {String}
 */
JSI.getEventLink = function(jn){
	var j = JSIHost[jn];
	return j.getInfo(event);
};
//----------------------------- Общие
/** Получить info объект из значения
 *
 * @param {String} jn
 * @param {Object} val
 * @return {Object}
 */
JSI.getInfo = function(jn, vn){
	var val = JSI.eval(vn);
	return {value:JSIHost[jn].getInfo(val)};
};
/**
 * @private
 */
JSI.tryGetInfo = function(jn, vn){
	var o;
	try{
		o = JSI.getInfo(jn, vn);
	}catch(e){
		o = {value:null, error:JSICallbacks.getErrorObject(JSIHost[jn], e, vn)};
	};
	return o;
};
/** Замена обычному eval, т.к. глобальная функция eval вызывает ошибку в FireFox'е
 * "function eval must be called directly, and not by way of a function of another name",
 * и я решил эту проблему созданием и последующим выполнением анонимной функции.
 *
 * @param {String} n Код, который нужно выполнить. В осносном будет парсить пути в точечной нотации.
 */
JSI.eval = function(n){
	var f = new Function('return '+n+';');
	return f();
};
/** Получить список info объектов из значений, с указанием JSI объекта
 *
 * @param {JSIMain} j
 * @param {Array} args
 * @return {Array}
 */
JSI.convertListToInfoIn = function(j, args){
	var ret = [];
	if(args){
		var len = args.length;
		for(var i=0; i<len; i++){
			ret[i] = j.getInfo(args[i]);
		};
	};
	return ret;
};
/** Получить значение из info объекта
 *
 * @param {String} jn
 * @param {Object} info
 * @return {Object}
 */
JSI.getValue = function(jn, o){
	var r;
	if(o instanceof Object){
		r = JSI.getValueIn(JSIHost[jn], o);
	}else{
		r = o;
	};
	return r;
};
/** Получить значение из info объекта, с указанием JSI объекта
 *
 * @param {JSIMain} j
 * @param {Object} info
 * @return {Object}
 */
JSI.getValueIn = function(j, o){
	var r;
	if(o instanceof Object && o.constructor==Object){
		if(o.isComplex){
			r = JSI.getComplexValueIn(j, o);
		}else{
			r = JSI.getSimpleValueIn(j, o);
		};
	}else{
		r = o;
	};
	return r;
};
/** Получить значение комплексного типа
 * @private
 * @param {Object} j
 * @param {Object} o
 */
JSI.getComplexValueIn = function(j, o){
	var r;
	if(o.side=='JS'){
		if(o.type=='function'){
			r = j.funcs.getItem(o.value);
		}else{
			r = j.objects.getItem(o.value);
		};
	}else{
		if(o.type=='function'){
			r = j.callbacks.getItemByInfo(o);
		}else{
			r = new FLObject(j, o);
			var cn = o[FLObject.classInfoProperty];
			var jn = j.name;
			if(cn && FLObject.hasRegisteredWrapper(cn, jn)){
				r = FLObject.createWrapper(r, cn, jn);
			};
		};
	};
	return r;
};
/** Получить значение простого типа
 * @private
 * @param {Object} j
 * @param {Object} o
 */
JSI.getSimpleValueIn = function(j, o){
	var r;
	if(o.type=='array'){
		r = JSI.convertListToValueIn(j, o.value);
	}else if(o.type=='object'){
		r = JSI.convertObjectToValueIn(j, o.value);
	}else{
		r = o.value;
	};
	return r;
};
/** Получить значения из списка info объектов, с указанием JSI объекта
 *
 * @param {JSIMain} j
 * @param {Array} args
 * @return {Array}
 */
JSI.convertListToValueIn = function(j, args){
	var r = [];
	if(args){
		var len = args.length;
		for(var i=0; i<len; i++){
			r[i] = JSI.getValueIn(j, args[i]);
		};
	};
	return r;
};
/** Получить значения из ассоциативного массива(объекта) info объектов, с указанием JSI объекта
 *
 * @param {JSIMain} j
 * @param {Array} args
 * @return {Array}
 */
JSI.convertObjectToValueIn = function(j, obj){
	var r = {};
	if(obj){
		for(var p in obj){
			r[p] = JSI.getValueIn(j, obj[p]);
		};
	};
	return r;
};
/**
 *
 * @param {String} jn
 * @param {Object} o
 * @param {String} p
 * @return {Object}
 */
JSI.getParamValue = function(jn, o, p){
	o = JSI.getValue(jn, o);
	var f = JSI.eval('function(o){return o.'+p+'}');
	var r = f(o);
	return {value:JSIHost[jn].getInfo(r)};
};
/**
 * @private
 */
JSI.tryGetParamValue = function(jn, o, p){
	var r;
	try{
		r = JSI.getParamValue(jn, o, p);
	}catch(e){
		r = {value:null, error:JSICallbacks.getErrorObject(JSIHost[jn], e, o, p)};
	};
	return r;
};
//----------------------------- Объекты
/** Получить объект по ссылке на JSI и ссылки на требуемый объект
 *
 * @param {String} jn
 * @param {String} nm
 * @return {Object}
 */
JSI.getObject = function(jn, nm){
	return JSIHost[jn].objects.getItem(nm);
};
/** Создать экземпляр класса
 *
 * @param {String} jn - Имя экземпляра фреймворка
 * @param {String} args - Строка с аргументами, через запятую
 * @param {String} code - Код функции
 * @return {Object}
 */
JSI.createFunction = function(jn, args, code){
	var j = JSIHost[jn];
	var func = JSI.eval('function('+args+'){'+code+'};');
	return {value:j.getInfo(func)};
};
/**
 * @private
 */
JSI.tryCreateFunction = function(jn, args, code){
	var o;
	try{
		o = JSI.createFunction(jn, args, code);
	}catch(e){
		o = {value:null, error:JSICallbacks.getErrorObject(JSIHost[jn], e, 'Function')};
	};
	return o;
};
/** Создать экземпляр класса
 *
 * @param {String} jn - Имя экземпляра фреймворка
 * @param {String} cn - Имя класса создаваемого объекта
 * @param {Array} args - Список аргументов передаваемых в конструктор
 * @return {Object}
 */
JSI.createInstance = function(jn, cn, args){
	var j = JSIHost[jn];
	var cls = JSI.eval(cn);
	args = JSI.convertListToValueIn(j, args);
	return {value:j.getInfo(JSIInstance.create(cls, args))};
};
/**
 * @private
 */
JSI.tryCreateInstance = function(jn, cn, args){
	var o;
	try{
		o = JSI.createInstance(jn, cn, args);
	}catch(e){
		o = {value:null, error:JSICallbacks.getErrorObject(JSIHost[jn], e, cn)};
	};
	return o;
};
/** Создать экземпляр класса
 *
 * @param {String} jn - Имя экземпляра фреймворка
 * @param {String} cn - Имя класса создаваемого объекта
 * @param {Array} args - Список аргументов передаваемых в конструктор
 * @return {Object}
 */
JSI.createInstanceByLink = function(jn, nm, t, args){
	var j = JSIHost[jn];
	var cls;
	if(t=='function'){
		cls = j.funcs.getItem(nm);
	}else{
		cls = j.objects.getItem(nm).constructor;
	}
	args = JSI.convertListToValueIn(j, args);
	return {value:j.getInfo(JSIInstance.create(cls, args))};
};
/**
 * @private
 */
JSI.tryCreateInstanceByLink = function(jn, nm, t, args){
	var o;
	try{
		o = JSI.createInstanceByLink(jn, nm, t, args);
	}catch(e){
		o = {value:null, error:JSICallbacks.getErrorObject(JSIHost[jn], e, nm)};
	};
	return o;
};
/** Удалить ссылку на объект
 *
 * @param {String} jn
 * @param {String} nm
 */
JSI.removeObject = function(jn, nm){
	JSIHost[jn].objects.removeItem(nm);
};
/** Проверить существование ссылки на объект
 *
 * @param {String} jn
 * @param {String} nm
 * @return {Boolean}
 */
JSI.isExistsObject = function(jn, nm){
	return JSIHost[jn].objects.isExists(nm);
};
//----------------------------- Функции
/** Получить объект функции по ссылке
 *
 * @param {String} jn
 * @param {String} fn
 * @return {Function}
 */
JSI.getFunc = function(jn, fn){
	return JSIHost[jn].funcs.getItem(fn);
};
/** Удаляет ссылку на функцию
 *
 * @param {String} jn
 * @param {String} fn
 * @return {Boolean}
 */
JSI.removeFunc = function(jn, fn){
	return JSIHost[jn].funcs.removeItem(fn);
};
/** Проверяет существование ссылки на функцию
 *
 * @param {String} jn
 * @param {String} fn
 * @return {Boolean}
 */
JSI.isExistsFunc = function(jn, fn){
	return JSIHost[jn].funcs.isExists(fn);
};
/** Проверяет соответствие функции переданной по ссылке к содержимому свойства сохранённого объекта.
 * Если Функция не была удалена из этотго свойства, то она будет вызвана через имя свойства, если нет - будет вызвана через ссылку на функцию
 * @param {String} jn
 * @param {String} fn
 * @param {String} pn
 * @return {Boolean}
 */
JSI.isCurrentFunc = function(jn, fn, pn){
	return JSIHost[jn].funcs.isCurrent(fn, pn);
};
/** Вызвать функцию по ссылке на эту же функцию
 *
 * @param {String} jn
 * @param {String} fn
 * @param {String} pn
 * @param {Array} args
 * @return {Object}
 */
JSI.callFunction = function(jn, fn, pn, args){
	var j = JSIHost[jn];
	var f = j.funcs.getItemObject(fn);
	return {value:j.getInfo(JSI.__callFunction(j, f, fn, pn, JSI.convertListToValueIn(j, args)))};
};
/**
 * @private
 */
JSI.tryCallFunction = function(jn, fn, pn, args){
	var r;
	try{
		r = JSI.callFunction(jn, fn, pn, args);
	}catch(e){
		var j = JSIHost[jn];
		var f = j.funcs.getItemObject(fn);
		r = {value:null, error:JSICallbacks.getErrorObject(j, e, pn, f.name)};
	};
	return r;
};
/**
 * @private
 * @param {JSIMain} j
 * @param {Object} f
 * @param {String} fn
 * @param {String} pn
 * @param {Array} args
 * @return {Object}
 */
JSI.__callFunction = function(j, f, fn, pn, args){
	var val;
	if(pn){
		val = f.func.apply(j.objects.getItem(pn), args);
	}else{
		var p = f.parent;
		var n = f.name;
		if(p && n && j.funcs.isCurrent(fn, p)){
			val = JSIInstance.callMethod(j.objects.getItem(p), n, args);
		}else{
			val = JSIInstance.callFunction(f.func, args);
		};
	};
	return val;
};
/** Получить JS-функцию, обёртку флешового калбека
 *
 * @param {String} jn
 * @param {String} cn
 * @return {Function}
 */
JSI.getCallback = function(jn, cn){
	var j = JSIHost[jn];
	return j.callbacks.getItem(cn);
};
/** Вызов функции callLater(obj, func, handler, time=1), который вызывает func по таймауту, а результат возвращать в хендлер.
 * {String} jn Ссылка на объект JSIMain
 * {Object,String} nm Ссылка или сам объект, в котором находится необходимая функция
 * {String} hn Имя функции
 * {Array} a Массив аргументов функции
 * {String} cn Ссылка на калбек, в который будут переданы результаты работы функции
 * {Number} t Таймаут через который будет выполнена функция
 */
JSI.callLater = function(jn, nm, hn, a, cn, t){
	var j = JSIHost[jn];
	var f = JSI.__getCallLater(j);
	JSI.__callLater(f, j, nm, hn, a, cn);
	setTimeout(f, t);
};
/**
 * @private
 */
JSI.__callLater = function(f, j, nm, hn, a, cn){
	if(typeof nm == 'string'){
		nm = j.objects.getItem(nm);
	};
	f._o = nm;
	f._hn = hn;
	f._a = a;
	if(cn){
		f._c = j.callbacks.getItem(cn);
	};
};
/**
 * @private
 */
JSI.__getCallLater = function(j){
	var f = function(){
		var c = arguments.callee;
		var r = JSIInstance.callMethod(c._o,  c._hn, c._a);
		if (c._c){
			c._c(r);
		};
	};
	return f;
};
/**
 * @private
 */
JSI.tryCallLater = function(jn, nm, hn, a, cn, t){
	var j = JSIHost[jn];
	var f = JSI.__tryGetCallLater(j);
	JSI.__callLater(f, j, nm, hn, a, cn);
	setTimeout(f, t);
};
/**
 * @private
 */
JSI.__tryGetCallLater = function(j){
	var f = function(){
		var c = arguments.callee;
		var r;
		try{
			r = JSIInstance.callMethod(c._o,  c._hn, c._a);
		}catch(e){
			c._j.callbacks.throwException(e, c._o, c._hn);
		};
		if (c._c){
			c._c(r);
		};
	};
	f._j = j;
	return f;
};
//----------------------------- Свойства
/** Получить свойство
 *
 * @param {String} jn
 * @param {String} nm
 * @param {String} pn
 * @return {Object}
 */
JSI.getProperty = function(jn, nm, t, pn){
	var j = JSIHost[jn];
	var o = (t=='function' ? j.funcs : j.objects).getItem(nm);
	var r;
	if(pn in o){
		r = o[pn];
	};
	return {value:j.getInfo(r, nm, pn)};
};
/**
 * @private
 */
JSI.tryGetProperty = function(jn, nm, t, pn){
	var r;
	try{
		r = JSI.getProperty(jn, nm, t, pn);
	}catch(e){
		r = {value:null, error:JSICallbacks.getErrorObject(JSIHost[jn], e, nm, pn)};
	};
	return r;
};
/** Проверить существование свойства
 *
 * @param {String} jn
 * @param {String} nm
 * @param {String} pn
 * @return {Boolean}
 */
JSI.hasProperty = function(jn, nm, t, pn){
	var j = JSIHost[jn];
	var o = (t=='function' ? j.funcs : j.objects).getItem(nm);
	return {value:(pn in o)};
};
/**
 * @private
 */
JSI.tryHasProperty = function(jn, nm, t, pn){
	var r;
	try{
		r = JSI.hasProperty(jn, nm, t, pn);
	}catch(e){
		r = {value:null, error:JSICallbacks.getErrorObject(JSIHost[jn], e, nm, pn)};
	};
	return r;
};
/** Установить значение свойства
 *
 * @param {String} jn
 * @param {String} nm
 * @param {String} pn
 * @param {Object} info
 */
JSI.setProperty = function(jn, nm, t, pn, info){
	var j = JSIHost[jn];
	var o = (t=='function' ? j.funcs : j.objects).getItem(nm);
	o[pn] = JSI.getValueIn(j, info);
	return {value:null};
};
/**
 * @private
 */
JSI.trySetProperty = function(jn, nm, t, pn, info){
	var r;
	try{
		r = JSI.setProperty(jn, nm, t, pn, info);
	}catch(e){
		r = {value:null, error:JSICallbacks.getErrorObject(JSIHost[jn], e, nm, pn)};
	};
	return r;
};
/** Удалить свойство
 *
 * @param {String} jn
 * @param {String} nm
 * @param {String} pn
 * @return {Boolean}
 */
JSI.deleteProperty = function(jn, nm, t, pn){
	var j = JSIHost[jn];
	var o = (t=='function' ? j.funcs : j.objects).getItem(nm);
	return {value:delete o[pn]};
};
/**
 * @private
 */
JSI.tryDeleteProperty = function(jn, nm, t, pn){
	var r;
	try{
		r = JSI.deleteProperty(jn, nm, t, pn);
	}catch(e){
		r = {value:null, error:JSICallbacks.getErrorObject(JSIHost[jn], e, nm, pn)};
	};
	return r;
};
/** Вызвать свойство, как метод
 *
 * @param {String} jn
 * @param {String} nm
 * @param {String} hn
 * @param {Array} args
 * @return {Object}
 */
JSI.callProperty = function(jn, nm, t, hn, args){
	var j = JSIHost[jn];
	var o = (t=='function' ? j.funcs : j.objects).getItem(nm);
	var r;
	if(JSIFunctions.isFunction(o[hn])){
		r = JSI.callPropertyAsFunc(j, o, hn, args);
	}else{
		r = j.getInfo(o[hn], nm, hn);
	};
	return {value:r};
};
/**
 * @private
 */
JSI.tryCallProperty = function(jn, nm, t, hn, args){
	var r;
	try{
		r = JSI.callProperty(jn, nm, t, hn, args);
	}catch(e){
		r = {value:null, error:JSICallbacks.getErrorObject(JSIHost[jn], e, nm, hn)};
	};
	return r;
};
/** Вызвать метод по ссылке на объект
 *
 * @param {JSIMain} j
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 * @return {Object}
 */
JSI.callPropertyAsFunc = function(j, o, hn, args){
	args = JSI.convertListToValueIn(j, args);
	return j.getInfo(JSIInstance.callMethod(o, hn, args));
};
/** Перебрать свойства объекта, отправляя информацию о свойстве в каллбек функцию - имя, info
 *
 * @param {Object} jn
 * @param {Object} nm
 * @param {Object} cn
 */
JSI.forEach = function(jn, nm, cn){
	var j = JSIHost[jn];
	var o = j.objects.getItem(nm);
	var fem = JSICallbacks.forEachMethod;
	var m = j.main;
	for(var p in o){
		m[fem](cn, p, j.getInfo(o[p]));
	};
};
/** Получить список доступных свойств объекта, по ссылке
 *
 * @param {String} jn
 * @param {String} nm
 * @return {Array}
 */
JSI.getPropertyList = function(jn, nm){
	var j = JSIHost[jn];
	var o = j.objects.getItem(nm);
	var list = [];
	for(var p in o){
		list.push(p);
	};
	return list;
};
//---------------------------------------------------------------------------------------------------- ПОЛУЧЕНИЕ ССЫЛКИ НА ОБЪЕКТ ФЛЕШКИ ДЛЯ КАЛЛБЕКОВ
/** Oбъект для поиска флеш объектов в документе. */
JSIElement = function(){};
JSIElement.EmbedNodeName='embed';
//---------------------------------------------------------------------------------------------------- JSIElement PUBLIC
//---------------------------------------------------------------------------------------------------- JSIElement STATIC
/** Получить object/embed элемент DOM структуры по его ID или URL
 *
 * @param {String} id
 * @param {String} url
 * @return {HTMLElement}
 */
JSIElement.get = function(id, url){
	var r;
	if(id){
		var d = JSI.d();
		r = JSI.isIE() ? d[id] : JSIElement.getEmbedNode(d, id);
		if(!r){
			r = d.getElementById(id);
		};
		if(!r){
			r = JSIElement.getObjectByName(id);
		};
	};
	if(!r){
		r = JSIElement.find(url);
	};
	return r;
};
/**
 * @private
 * @param {Object} d
 * @param {Object} id
 */
JSIElement.getEmbedNode = function(d,id){
	var d=JSI.d();
	var r;
	if(id in window){
	r = JSIElement.getEmbed(window[id]);
	};
	if(!r && id in d){
		r = JSIElement.getEmbed(d[id]);
	};
	if(!r && 'all' in d && id in d.all){
		r = JSIElement.getEmbed(d.all[id]);
	};
	return r;
};
/**
 * @private
 * @param {Object} node
 */
JSIElement.isEmbed = function(node){
	if(node instanceof HTMLElement && node.nodeName.toLowerCase()==JSIElement.EmbedNodeName){
		return true;
	}else{
		return false;
	};
};
/**
 * @private
 * @param {Object} v
 */
JSIElement.getEmbed = function(v){
	var r;
	if(v){
		if(JSIElement.isEmbed(v)){
			r = v;
		}else if('length' in v){
			var l = v.length;
			for(var i=0; i<l; i++){
				if(JSIElement.isEmbed(v[i])){
					r = v[i];
					break;
				};
			};
		};
	};
	return r;
};

/** Найти элемент <object> по его имени
 *
 * @param {String} n
 * @return {HTMLElement}
 */
JSIElement.getObjectByName = function(n){
	var r;
	var list = JSI.d().getElementsByTagName('object');
	var len = list.length;
	for(var i=0; i<len; i++){
		var o = list[i];
		if(('name' in o && o.name==n) || ('name' in o.attributes && o.attributes.name.value==n) || JSIElement.findIEVerifyParams(o.childNodes, 'name', n)){
			r = o;
			break;
		};
	};
	return r;
}
/** Найти элемент по его URL
 *
 * @param {String} url
 * @return {HTMLElement}
 */
JSIElement.find = function(url){
	var r = JSIElement.findNOIE(url);
	if(!r){
		r = JSIElement.findIE(url);
	};
	return r;
};
/** Ищет элемент в случае, если браузер IE
 *
 * @param {String} url
 * @return {HTMLElement}
 */
JSIElement.findIE = function(url){
	var r;
	var list = JSI.d().getElementsByTagName('object');
	var len = list.length;
	for(var i=0; i<len; i++){
		var o = list[i];
		if(JSIElement.findIEIsValid(o, url)){
			r = o;
			break;
		};
	};
	if(!r){
		r = list[0];
	};
	return r;
};
/** проверяет элемент <object> насоответствие по атрибуту data и параметру movie, если одно из них совпадает, то выдаст true
 *
 * @param {HTMLElement} o
 * @param {String} url
 * @return {Boolean}
 */
JSIElement.findIEIsValid = function(o, url){
	if(JSIElement.findIEVerifyAttrs(o, url)){
		return true;
	}else{
		return JSIElement.findIEVerifyParams(o.childNodes, 'movie', url);
	};
};
/** ищет в аргументах тега <object> аргумент с именем data и сверяет значение URL на соответствие
 *
 * @param {HTMLElement} o
 * @param {String} url
 * @return {Boolean}
 */
JSIElement.findIEVerifyAttrs = function(o, url){
	var r;
	if('data' in o && o.data==url){
		r = true;
	};
	if('data' in o.attributes && o.attributes.data.vaule==url){
		r = true;
	};
	return r;
};
/** ищет в параметрах тега <object> параметр с именем n и сверяет значение v на соответствие
 *
 * @param {NodeList} list
 * @param {String} n
 * @param {String} v
 * @return {Boolean}
 */
JSIElement.findIEVerifyParams = function(list, n, v){
	var len = list.length;
	for(var i=0; i<len; i++){
		var a = list[i].attributes;
		if(a.name.value==n){
			if(a.value.value==v){
				return true;
			}else{
				return false;
			};
		};
	};
	return false;
};
/** Ищет элемент <embed> в случаях, когда текущий браузер не является IE
 *
 * @param {String} url
 * @return {HTMLElement}
 */
JSIElement.findNOIE = function(url){
	var r;
	var list = JSI.d().getElementsByTagName('embed');
	var len = list.length;
	for(var i=0; i<len; i++){
		var o = list[i];
		var a = o.attributes.src;
		if(a && a.value==url){
			r = o;
			break;
		};
	};
	if(!r){
		r = list[0];
	};
	return r;
};
//---------------------------------------------------------------------------------------------------- ПОЛУЧЕНИЕ ССЫЛКИ НА ОБЪЕКТ ФЛЕШКИ ДЛЯ КАЛЛБЕКОВ
/** Обеспечивает быстрый доступ к самым необходимым свойствам окна и документа. */
JSIBrowser = function(){};
//---------------------------------------------------------------------------------------------------- JSIBrowser PUBLIC
//---------------------------------------------------------------------------------------------------- JSIBrowser STATIC
/** Проверяет и воссоздаёт теги <head><title></title></head> для безпроблемного задания заголовка окна. Патч для Opera. */
JSIBrowser.presetTitle = function(){
	var d = JSI.d();
	var f = d.getElementsByTagName;
	if(d){
		if(!f.call(d,'head').length){
			d.appendChild(d.createElement('head'));
		};
		if(!f.call(d,'title').length){
			f.call(d,'head')[0].appendChild(d.createElement('title'));
		};
	};
};
/** Получить заголовок документа */
JSIBrowser.getTitle = function(){
	return JSI.hasDocument() ? JSI.d().title : '';
};
/** Задать заголовок документа
 *
 * @param {String} p
 */
JSIBrowser.setTitle = function(p){
	if(JSI.hasDocument()){
		JSI.d().title = p;
	};
};
/** Получить статус окна */
JSIBrowser.getStatus = function(){
	return window.status;
};
/** Задать статус окна
 *
 * @param {String} p
 */
JSIBrowser.setStatus = function(p){
	window.status = p;
};
/** Получить статус окна по умлочанию */
JSIBrowser.getDefaultStatus = function(){
	return window.defaultStatus;
};
/** Задать статус окна по умлочанию
 *
 * @param {String} p
 */
JSI.setDefaultStatus = function(p){
	window.defaultStatus = p;
};
/** Получить строку адреса */
JSIBrowser.getLocation = function(){
	if(JSI.hasDocument()){
		return JSI.d().location.href;
	}else{
		return window.location.href;
	};
};
/** Получить строку адресса окна */
JSIBrowser.getTopLocation = function(){
	var p = window.top;
	if(JSI.hasDocument()){
		return p.document.location.href;
	}else{
		return p.location.href;
	};
};
/** Получить хеш текущего адреса */
JSIBrowser.getLocationHash = function(){
	if(JSI.hasDocument()){
		return JSI.d().location.hash;
	}else{
		return window.location.hash;
	};
};
/** Задать хеш текущего адреса
 *
 * @param {String} p
 */
JSIBrowser.setLocationHash = function(p){
	if(JSI.hasDocument()){
		JSI.d().location.hash = p;
	}else{
		window.location.hash = p;
	};
};
/** Получить строку куки */
JSIBrowser.getCookieString = function(){
	return JSI.d().cookie;
};
/** Задать строку куки
 *
 * @param {String} p
 */
JSIBrowser.setCookieString = function(p){
	JSI.d().cookie = p;
};
//---------------------------------------------------------------------------------------------------- СОЗДАНИЕ ЭКЗЕМПЛЯРОВ
/** Объект создающий экземпляры объектов и вызывает функции без смены областей видимости */
JSIInstance = function(){};
//---------------------------------------------------------------------------------------------------- JSIBrowser PUBLIC
//---------------------------------------------------------------------------------------------------- JSIBrowser STATIC
/** Метод создания экземпляра класса с любым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create = function(cls, args){
	var r;
	if(args){
		r = JSIInstance['create'+args.length](cls, args);
	}else{
		r = JSIInstance.create0(cls);
	};
	return r;
};
/** Вызывает метод под динамическим именем
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod = function(o, hn, args){
	var r;
	if(args){
		r = JSIInstance['callMethod'+args.length](o, hn, args);
	}else{
		r = JSIInstance.callMethod0(o, hn);
	};
	return r;
};
/** Вызывает функцию напрямую, не меняя её области видимости.
 *
 * @param {Function} f
 * @param {Array} args
 */
JSIInstance.callFunction = function(f, args){
	var r;
	if(args){
		r = JSIInstance['callFunction'+args.length](f, args);
	}else{
		r = JSIInstance.callFunction0(f);
	};
	return r;
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create0 = function(cls, args){
	return new cls();
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create1 = function(cls, args){
	return new cls(args[0]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create2 = function(cls, args){
	return new cls(args[0], args[1]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create3 = function(cls, args){
	return new cls(args[0], args[1], args[2]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create4 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create5 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create6 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4], args[5]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create7 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create8 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create9 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create10 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create11 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create12 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create13 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create14 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13]);
};
/** Метод создания экземпляра класса с N-ым кол-вом аргументов
 *
 * @param {Object} cls
 * @param {Array} args
 */
JSIInstance.create15 = function(cls, args){
	return new cls(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13], args[14]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod0 = function(o, hn, args){
	return o[hn]();
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod1 = function(o, hn, args){
	return o[hn](args[0]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod2 = function(o, hn, args){
	return o[hn](args[0], args[1]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod3 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod4 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod5 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod6 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4], args[5]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod7 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod8 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod9 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod10 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod11 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod12 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod13 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod14 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13]);
};
/** Вызывает метод под динамическим именем с N-ым кол-вом аргументов
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callMethod15 = function(o, hn, args){
	return o[hn](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13], args[14]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction0 = function(f, args){
	return f();
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction1 = function(f, args){
	return f(args[0]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction2 = function(f, args){
	return f(args[0], args[1]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction3 = function(f, args){
	return f(args[0], args[1], args[2]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction4 = function(f, args){
	return f(args[0], args[1], args[2], args[3]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction5 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction6 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4], args[5]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction7 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction8 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction9 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction10 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction11 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction12 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction13 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction14 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13]);
};
/** Вызывает функцию с N-ым кол-вом аргументов не меняя её области видимости
 *
 * @param {Object} o
 * @param {String} hn
 * @param {Array} args
 */
JSIInstance.callFunction15 = function(f, args){
	return f(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13], args[14]);
};
//---------------------------------------------------------------------------------------------------- ГЛАВНЫЙ ОБЪЕКТ СИСТЕМЫ
/** Контейнер для всей системы.
 *
 * @param {String} i
 * @param {String} u
 * @param {String} n
 */
JSIMain = function(i, u, n){
	this.id = i;
	this.url = u;
	this.name = n;
	this.funcs = new JSIFunctions(this);
	this.objects = new JSIObjects(this);
	this.callbacks = new JSICallbacks(this);
	this.getDocProps();
};
/** Шорткат прототипа JSIMain */
JSI.mp = JSIMain.prototype;
/**
 * @private
 */
JSI.mp.getDocProps = function(){
	if(JSI.hasDocument()){
		this.tag = JSIMain.getTag();
		this.main = JSIElement.get(this.id, this.url);
	};
};
/** Шорткат для указателя баузера */
JSIMain.ieBrowser = JSI.isIE();
/** Объект содержащий свойства по строковым значениям простых типов данных. */
JSIMain.simple = {};
JSIMain.simple['number'] = true;
JSIMain.simple['string'] = true;
JSIMain.simple['boolean'] = true;
//---------------------------------------------------------------------------------------------------- JSIMain PUBLIC
/** Удалить все приобретённые знания
 *
 * @param {Object} c - удалить Flash каллбеки
 * @param {Object} o - удалить Flash объекты
 */
JSI.mp.clear = function(c, o){
	if(c){
		this.callbacks.clear();
	};
	if(o){
		this.objects.clear();
		this.funcs.clear();
	};
};
/** Получить развёрнутую информацию о значении. Если значением аргумента является объект, то вместо него, в возвращаемом объекте будет находиться ссылка на этот объект.
 * @param {Object} val - Значение для которого собирается информация
 * @param {String} p - Ссылка на объект родитель для текущего значения *Для функций
 * @param {String} n - Имя параметра в котором содержится значение *Для функций
 * @return {Object}
*/
JSI.mp.getInfo = function(v, p, n){
	var o;
	if(v instanceof Object || typeof v == 'object'){
		if(v instanceof FLSimple){
			o = this.getSimpleInfo(v);
		}else if(v instanceof FLObject){
			o = v.info;
		}else{
			o = this.getComplexInfo(v, p, n);
		};
	}else{
		o = v;
	};
	return o;
};
/** Получить инфо о сложном объекте со ссылкой на него.
 *
 * @param {Object} v
 * @param {String} p
 * @param {String} n
 * @return {Object}
 */
JSI.mp.getComplexInfo = function(v, p, n){
	var o = JSIMain.__getInfo(v);
	if(o.isComplex){
		if(o.type=='function'){
			if('jsDynamicInfo' in v){
				return v.jsDynamicInfo;
			}else{
				o.value = this.funcs.addItem(v, p, n);
			};
		}else{
			o.value = this.objects.addItem(v);
		};
	};
	return o;
};
/** Получить инфо о простом объекте, но если в нём содержмится ссылка на сложный объект, то он будет передан по ссылке, как полагается.
 *
 * @param {Object} v
 * @return {Object}
 */
JSI.mp.getSimpleInfo = function(v){
	var o = v.data;
	if(o instanceof Array){
		o = this.getSimpleArray(o);
	}else if(o instanceof Object){
		o = this.getSimpleObject(o);
	};
	return {value:o, type:JSIMain.getType(o), isComplex:false, side:'JS'};
};
/** Получить дубликат объекта с информацией о сложных объектах находящихся в нём, подготовленных к переноске во флеш среду.
 *
 * @param {Object} v
 * @return {Object}
 */
JSI.mp.getSimpleObject = function(v){
	var r = {};
	for(var p in v){
		r[p] = this.getInfo(v[p]);
	};
	return r;
};
/** Получить дубликат массива с информацией о сложных объектах находящихся в нём, подготовленных к переноске во флеш среду.
 *
 * @param {Array} v
 * @return {Array}
 */
JSI.mp.getSimpleArray = function(v){
	var r = [];
	var l = v.length;
	for(var i=0; i<l; i++){
		r[i] = this.getInfo(v[i]);
	};
	return r;
};
/** Получить шаблон с информацией о значении.
 * @private
 * @param {Object} val
 * @return {Object}
 */
JSIMain.__getInfo = function(val){
	return {value:val, type:JSIMain.getType(val), isComplex:JSIMain.isComplex(val), side:'JS'};
};
/** Получить тип значения
 *
 * @param {Object} o
 * @return {String}
 */
JSIMain.getType = function(o){
	var t = typeof o;
	if(t == 'object'){
		if(o){
			if(o instanceof Array){
				t = 'array';
			}else if(JSIMain.ieBrowser){
				t = JSIMain.getIEString(o, t);
			};
		}else{
			t = 'void';
		};
	}else if(o.constructor==Object){
		t = 'object';
	};
	return t;
};
/** Получает достоверную информацию, объект был передан или функция.
 * В IE, некоторые функции в операции typeof возвращают "object", а этот способ даёт гарантию получения точного типа.
 * @param {Object} o
 * @param {String} t
 * @return {String}
 */
JSIMain.getIEString = function(o, t){
	if('toString' in o){
		var p = o.toString().indexOf('function');
		if(p>=0 && p<3){
			t = 'function';
		};
	};
	return t;
};
/** Проверяет комплексного ли типа значение переданое в качестве аргумента
 *
 * @param {Object} o
 * @return {Boolean}
 */
JSIMain.isComplex = function(o){
	return (!Boolean(!o || JSIMain.simple[typeof o]) || o instanceof Array);
};
//---------------------------------------------------------------------------------------------------- JSIMain STATIC
/** Получить тэг, который будет использован как контейнер для создаваемых, в процессе работы системы, временных узлов
 * @return {HTMLElement}
 */
JSIMain.getTag = function(){
	var d = JSI.d();
	var hd = d.getElementsByTagName('head')[0];
	if(!hd){
		hd = d.createElement('head');
		d.firstChild.appendChild(hd);
	};
	return hd;
};
//----------------------------------- ОБЪЕКТ КОНТРОЛИРУЮЩИЙ ССЫЛКИ НА JS ФУНКЦИИ ВНУТРИ ФЛЕШ ПЛЕЕРА
/**
 *
 * @param {Object} i
 */
JSIFunctions = function(i){
	this.jsi = i;
	this.index = 0;
	this.items = {};
};
/** Шорткат прототипа JSIFunctions */
JSI.fp = JSIFunctions.prototype;
/** Базовая часть ссылки на функцию. Ссылка состоит из базового имени и номера ссылки. Каждая ссылка уникальна. */
JSIFunctions.base = 'jf';
//---------------------------------------------------------------------------------------------------- JSIFunctions PUBLIC
/** Проверяет, функция была вызвана непосредственно из объекта или по ссылке.
 * @param {Function} fn - Функция
 * @param {String} pn - Ссылка на объект в котором находилась функция
 * @param {String} nm - Имя свойства в котором находилась функция
 * @return {String}
*/
JSI.fp.addItem = function(fn, pn, nm){
	var n = this.findItem(fn, pn, nm);
	if(!n){
		n = JSIFunctions.base+String(this.index++);
		this.items[n] = {func:fn, parent:pn, name:nm};
	};
	return n;
};
/** Получить функцию по ссылке
 *
 * @param {Function} fn Ссылка на функцию
 * @param {String} pn Ссылка на объект контейнер
 * @param {String} nm Имя свойства, в котором содержалась функция.
 */
JSI.fp.findItem = function(fn, pn, nm){
	for(var p in this.items){
		var o = this.items[p];
		if(o.func==fn && o.parent==pn && o.name==nm){
			return p;
		};
	};
	return '';
};
/** Получить функцию с указанием объекта
 *
 * @param {Function} fn
 * @param {Object} pt Объект в котором содержалась функция
 * @param {String} nm
 */
JSI.fp.addItemByTarget = function(fn, pt, nm){
	return this.addItem(fn, this.jsi.objects.addItem(pt), nm);
};
/** Получить функцию по ссылке.
 *
 * @param {String} n
 * @return {Function}
 */
JSI.fp.getItem = function(n){
	var o = this.items[n];
	if(o){
		return o.func;
	}else{
		return null;
	};
};
/** Получить объект функции по ссылке.
 *
 * @param {String} n
 * @return {Object}
 */
JSI.fp.getItemObject = function(n){
	return this.items[n];
};
/** Удалить ссылку на функцию
 *
 * @param {String} n
 */
JSI.fp.removeItem = function(n){
	delete this.items[n];
};
/** Удалить все ссылки на функции */
JSI.fp.clear = function(){
	for(var p in this.items){
		delete this.items[p];
	};
};
/** Проверить существование ссылки
 *
 * @param {String} n
 * @return {Boolean}
 */
JSI.fp.isExists = function(n){
	return Boolean(this.items[n]);
};
/**
 *
 * @param {String} fn
 * @param {Object} pt
 * @return {Boolean}
 */
JSI.fp.isCurrentByTarget = function(fn, pt){
	return this.isCurrent(fn, this.jsi.objects.addItem(pt));
};
/**
 *
 * @param {String} fn
 * @param {String} pn
 * @return {Boolean}
 */
JSI.fp.isCurrent = function(fn, pn){
	var jo = this.jsi.objects;
	var o = this.getItem(fn);
	var p = jo.getItem(o.parent);
	var t = jo.getItem(pn);
	if(p===t && t[o.name]===o.func){
		return true;
	}else{
		return false;
	};
};
//---------------------------------------------------------------------------------------------------- JSIFunctions STATIC
/** Проверить, не является ли объект функцей
 *
 * @param {Object} o
 * @return {Boolean}
 */
JSIFunctions.isFunction = function(o){
	if(o){
		var t = typeof o;
		if(t=='function'){
			return true;
		}else if(JSIMain.ieBrowser && t=='object'){
			var pos = String(o).indexOf('function');
			if(pos>=0 && pos<3){
				return true;
			};
		};
	};
	return false;
};
//----------------------------------- ОБЪЕКТ КОНТРОЛИРУЮЩИЙ ССЫЛКИ НА JS ОБЪЕКТЫ ВНУТРИ ФЛЕШ ПЛЕЕРА
/**
 *
 * @param {JSIMain} i
 */
JSIObjects = function(i){
	this.jsi = i;
	this.index = 0;
	this.items = {};
};
/** Шорткат прототипа JSIObjects */
JSI.op = JSIObjects.prototype;
/** Базовая часть ссылки на объект. ССылка состоит из базового имени и номера ссылки. Каждая ссылка уникальна. */
JSIObjects.base = 'jo';
//---------------------------------------------------------------------------------------------------- JSIObjects PUBLIC
/** Возвращает ссылку на объект. Если ссылка для этого объекта уже создана, то она будет возвращена.
 *
 * @param {Object} o
 */
JSI.op.addItem = function(o){
	for(var p in this.items){
		if(this.items[p]===o){
			return p;
		};
	};
	var name = JSIObjects.base+String(this.index++);
	this.items[name] = o;
	return name;
};
/** Получить объект по ссылке.
 *
 * @param {String} n
 */
JSI.op.getItem = function(n){
	return this.items[n];
};
/** Получить тип значения по ссылке
 *
 * @param {String} n
 */
JSI.op.getItemType = function(n){
	return typeof this.items[n];
};
/** Удалить ссылку на объект
 *
 * @param {String} n
 */
JSI.op.removeItem = function(n){
	delete this.items[n];
};
/** Удалить все ссылки на объекты */
JSI.op.clear = function(){
	for(var p in this.items){
		delete this.items[p];
	};
};
/** Проверить существование ссылки
 *
 * @param {String} n
 */
JSI.op.isExists = function(n){
	return Boolean(this.items[n]);
};
//---------------------------------------------------------------------------------------------------- JSIObjects STATIC
//----------------------------------- ОБЪЕКТ КОНТРОЛИРУЮЩИЙ КАЛЛБЕКИ
/** Объект создаёт функции обёртки позволяющие вызывать методы объектов по ссылкам, вести историю или вызывать калбеки */
JSICallbacks = function(i){
	this.objects = {};
	this.jsi = i;
};
/** Шорткат прототипа JSICallbacks */
JSI.cp = JSICallbacks.prototype;
JSICallbacks.getJSINameMethod = 'getJSIName';
JSICallbacks.forEachMethod = 'jsiCaller_ForEachMethod';
JSICallbacks.callbackMethod = 'jsiCaller_CallMethod';
JSICallbacks.exceptionMethod = 'jsiCaller_ThrowException';
JSICallbacks.objectCreateMethod = 'jsiCaller_Object_CreateMethod';
JSICallbacks.objectInstanceMethod = 'jsiCaller_Object_InstanceMethod';
JSICallbacks.objectCallMethod = 'jsiCaller_Object_CallMethod';
JSICallbacks.objectCallCommand = 'jsiCaller_Object_CallCommand';
JSICallbacks.objectHasMethod = 'jsiCaller_Object_HasMethod';
JSICallbacks.objectGetMethod = 'jsiCaller_Object_GetMethod';
JSICallbacks.objectSetMethod = 'jsiCaller_Object_SetMethod';
JSICallbacks.objectDeleteMethod = 'jsiCaller_Object_DeleteMethod';
JSICallbacks.objectRemoveMethod = 'jsiCaller_Object_RemoveMethod';
JSICallbacks.objectsClear = 'jsiCaller_Objects_Clear';
//---------------------------------------------------------------------------------------------------- JSICallbacks PUBLIC
/** Применяет функцию обратного вызова
 *
 * @param {String} cn Callback name
 * @param {String} on Object link value
 * @param {String} hn Handler function name
*/
JSI.cp.addItem = function(cn, on, hn){
	var obj = this.jsi.objects.getItem(on);
	if(cn){
		obj[hn] = this.getItem(cn);
	}else{
		delete obj[hn];
	};
};
/** Создаёт функцию обратного вызова, использует объект document
 * @private
 * @param {String} cn
 */
JSI.cp.getItem = function(cn){
	if(cn){
		return JSICallbacks.getHandler(this.jsi, cn);
	}else{
		return null;
	};
};
/** Создаёт функцию обратного вызова, добавляя ссылку на info объект
 *
 * @param {String} cn
 */
JSI.cp.getItemByInfo = function(info){
	var f = this.getItem(info.value);
	if(f){
		f.jsDynamicInfo = info;
	};
	return f;
};
/** Удалить функцию обратного вызова
 *
 * @param {String} on
 * @param {String} hn
 */
JSI.cp.removeItem = function(on, hn){
	var obj = this.jsi.objects.getItem(on);
	obj[hn] = null;
	delete obj[hn];
};
JSI.cp.clear = function(){
	for(var p in this.objects){
		delete this.objects[p];
	};
};
/** Отправляет информацию о ошибке во флеш плеер
 *
 * @param {Error} e Объект произошедшей ошибки
 * @param {Object,String} nm Сылка на объект или сам объект при обработке свойства которого произошла ошибка
 * @param {String} pn Имя свойства при обработке которого произошла ошибка
*/
JSI.cp.throwException = function(e, nm, pn){
	var m = this.jsi.main;
	m[JSICallbacks.exceptionMethod](JSICallbacks.getErrorObject(this.jsi, e, nm, pn));
};
//--------------------------------------------- For FLObject
/** Получает объект обёртку на флеш объект по его ссылке.
 *
 * @param {Object} on ссылка на флеш объект
 */
JSI.cp.addObject = function(on){
	var obj = this.getObject(on);
	if(!obj){
		obj = new FLObject(this.jsi, on);
		this.objects[on] = obj;
	};
};
/** Получить закешированый объект обёртку по ссылке на флеш объект, если он есть.
 *
 * @param {Object} on
 */
JSI.cp.getObject = function(on){
	return this.objects[on];
};
/** Удалить объект обёртку по ссылке на флеш объект
 *
 * @param {Object} on
 */
JSI.cp.removeObject = function(on){
	delete this.objects[on];
};
/** Создать флеш объект
 *
 * @param {String} cn
 * @param {Array} a
 */
JSI.cp.createObject = function(cn, a){
	var r = this.jsi.main[JSICallbacks.objectCreateMethod](cn, JSI.convertListToInfoIn(this.jsi, a));
	return this.getReturnedValue(r);
};
/** Получить существующий флеш объект через путь(точечная нотация)
 *
 * @param {Object} p
 */
JSI.cp.instanceObject = function(p, t){
	if(t && t instanceof FLObject){
		t = t.info;
	};
	var r = this.jsi.main[JSICallbacks.objectInstanceMethod](p, t);
	return this.getReturnedValue(r);
};
/** Удалить объект из стека ссылок
 *
 * @param {Object} p
 */
JSI.cp.removeObject = function(p){
	this.jsi.main[JSICallbacks.objectRemoveMethod](p);
};
/** Отчистить стек ссылок флеш объектов
 *
 * @param {Object} c - удалить JavaScript каллбеки
 * @param {Object} o - удалить JavaScript объекты
 */
JSI.cp.objectsClear = function(c, o){
	this.jsi.main[JSICallbacks.objectsClear](c, o);
};
/** Вызвать свойство/метод объекта
 *
 * @param {String} nm
 * @param {String} pn
 * @param {Array} a
 * @param {String} u
 */
JSI.cp.callProperty = function(nm, pn, a, u){
	var r = this.jsi.main[JSICallbacks.objectCallMethod](nm, pn, JSI.convertListToInfoIn(this.jsi, a), u);
	return this.getReturnedValue(r);
};
/** Вызвать команду, определённую во флеш плеере
 *
 * @param {String} nm
 * @param {String} cn
 * @param {Array} a
 */
JSI.cp.callCommand = function(nm, cn, a){
	if(!a){
		a = [];
	};
	if(!(a instanceof Array)){
		a  [a];
	};
	var r = this.jsi.main[JSICallbacks.objectCallCommand](nm, cn, JSI.convertListToInfoIn(this.jsi, a));
	return this.getReturnedValue(r);
};
/** Проверить существование свойства у флеш объекта
 *
 * @param {String} nm
 * @param {String} pn
 * @param {String} u
 */
JSI.cp.hasProperty = function(nm, pn, u){
	var r = this.jsi.main[JSICallbacks.objectHasMethod](nm, pn, u);
	return this.getReturnedValue(r);
};
/** Получить значение у свойства флеш объекта
 *
 * @param {String} nm
 * @param {String} pn
 * @param {String} u
 */
JSI.cp.getProperty = function(nm, pn, u){
	var r = this.jsi.main[JSICallbacks.objectGetMethod](nm, pn, u);
	return this.getReturnedValue(r);
};
/** Установить значение свойства флеш объекта
 *
 * @param {String} nm
 * @param {String} pn
 * @param {Object} v
 * @param {String} u
 */
JSI.cp.setProperty = function(nm, pn, v, u){
	var r = this.jsi.main[JSICallbacks.objectSetMethod](nm, pn, this.jsi.getInfo(v), u);
	return this.getReturnedValue(r);
};
/** Удалить свойство флеш объекта
 *
 * @param {String} nm
 * @param {String} pn
 * @param {String} u
 */
JSI.cp.deleteProperty = function(nm, pn, u){
	var r = this.jsi.main[JSICallbacks.objectDeleteMethod](nm, pn, u);
	return this.getReturnedValue(r);
};
/** Вызвать исключение полученное из флеш плеера
 *
 * @param {Object} o
 */
JSI.cp.throwObjectError = function(o){
	var e = new Error(o.message);
	e.flId = o.id;
	e.flDef = o.def;
	e.flName = o.name;
	e.flStackTrace = o.stackTrace;
	throw e;
};
/** Пролучить корректное значение из флеш плеера.
 *
 * @param {Object} r
 */
JSI.cp.getReturnedValue = function(r){
	if('error' in r){
		this.throwObjectError(r.error);
	}else{
		return JSI.getValueIn(this.jsi, r.value);
	};
	var u;
	return u;
};
//---------------------------------------------------------------------------------------------------- JSICallbacks STATIC
/** Получить функцию обратного вызова, использует объект document
 * @private
 * @param {JSIMain} j
 * @param {String} n
 */
JSICallbacks.getHandler = function(j, n){
	var f = function(){
		var a = arguments;
		var c = a.callee;
		var m = c._jsi.main;
		return m[JSICallbacks.callbackMethod](c._jsi.getInfo(this), c._n, JSI.convertListToInfoIn(c._jsi, a));
	};
	f._jsi = j;
	f._n = n;
	return f;
};
/**
 *
 * @param {Error} e
 * @param {Object} o
 * @param {String} pn
 */
JSICallbacks.getErrorObject = function(j, e, nm, pn){
	var o = {
		message:e.message,
		number:e.number,
		description:e.description,
		fileName:e.fileName,
		lineNumber:e.lineNumber,
		name:e.name,
		stack:e.stack,
		property:pn
	};
	JSICallbacks.__errTarget(j, o, nm);
	JSICallbacks.__errFL(e, o);
	return o;
};
/**
 * @private
 * @param {Object} j
 * @param {Object} o
 * @param {Object} nm
 */
JSICallbacks.__errTarget = function(j, o, nm){
	if(j && nm){
		if(typeof nm == 'string'){
			if(j.objects.isExists(nm)){
				o.target = j.getInfo(j.objects.getItem(nm));
			}else{
				o.target = nm;
			};
		}else{
			o.target = j.getInfo(nm);
		};
	};
};
/**
 * @private
 * @param {Object} e
 * @param {Object} o
 */
JSICallbacks.__errFL = function(e, o){
	if('flId' in e){
		o.flId = e.flId;
		o.flDef = e.flDef;
		o.flName = e.flName;
		o.flStackTrace = e.flStackTrace;
	};
};
//----------------------------------- ОБЪЕКТ ЗАГРУЖАЮЩИЙ ДОПОЛНИТЕЛЬНЫЕ ОБЪЕКТЫ
/**
 *
 *
 */
JSIInclude = function(){};
//---------------------------------------------------------------------------------------------------- JSIInclude PUBLIC
//---------------------------------------------------------------------------------------------------- JSIInclude STATIC
/** Задать загрузку JavaScript файла
 *
 * @param {String} jn
 * @param {String} url
 * @param {String} func
 * @param {String} type
 */
JSIInclude.loadJavaScript = function(jn, url, func, type){
	var j = JSIHost[jn];
	if(!type){
		type = 'text/javascript';
	};
	var el = JSIInclude.getJSEl(url, type);
	if(func){
		JSIInclude.getCH(j, el, func);
	};
	el.src = url;
	j.tag.appendChild(el);
	return j.getInfo(el);
};
/**
 * @private
 * @param {String} jn
 * @param {String} url
 * @param {String} func
 * @param {String} type
 */
JSIInclude.tryLoadJavaScript = function(jn, url, func, type){
	var o;
	try{
		o = JSIInclude.loadJavaScript(jn, url, func, type);
	}catch(e){
		var j = JSIHost[jn];
		j.callbacks.throwException(e, null, '');
	};
	return o;
};
/** Получить новый HTML-элемент SCRIPT
 * @private
 * @param {String} url
 * @param {String} type
 */
JSIInclude.getJSEl = function(url, type){
	var el = JSI.d().createElement('SCRIPT');
	el.setAttribute('type', type);
	return el;
};
/** Задать загрузку CSS файла
 *
 * @param {String} jn
 * @param {String} url
 * @param {String} func
 * @param {String} type
 */
JSIInclude.loadCSS = function(jn, url, func, type){
	var j = JSIHost[jn];
	if(!type){
		type = 'text/css';
	};
	var el = JSIInclude.getCSSEl(url, type);
	if(func){
		JSIInclude.getCH(j, el, func);
	};
	el.href = url;
	j.tag.appendChild(el);
	return j.getInfo(el);
};
/**
 * @private
 * @param {Object} jn
 * @param {Object} url
 * @param {Object} func
 * @param {Object} type
 */
JSIInclude.tryLoadCSS = function(jn, url, func, type){
	var o;
	try{
		o = JSIInclude.loadCSS(jn, url, func, type);
	}catch(e){
		var j = JSIHost[jn];
		j.callbacks.throwException(e, null, '');
	};
	return o;
};
/** Получить новый HTML-элемент LINK
 * @private
 * @param {JSIMain} j
 * @param {String} name
 * @param {String} url
 * @param {String} type
 */
JSIInclude.getCSSEl = function(url, type){
	var el = JSI.d().createElement('LINK');
	el.rel = 'stylesheet';
	el.setAttribute('type', type);
	return el;
};
/** Получить хандлер на событие загрузки
 * @private
 * @param {JSIMain} j
 * @param {HTMLElement} el
 * @param {String} func
 */
JSIInclude.getCH = function(j, el, func){
	var f = function(){
		var a = arguments;
		JSIInclude.callCH(this, a.callee._h, a);
		JSIInclude.clearCH(this);
	};
	f._h = j.callbacks.getItem(func);
	if(JSI.isIE()){
		el.onreadystatechange = f;
	}else{
		el.onload = f;
	};
	return f;
};
/** Вызвать флеш функцию по таймауту
 * @private
 * @param {HTMLElement} el
 * @param {Function} func
 * @param {Array} args
 */
JSIInclude.callCH = function(el, func, args){
	var f = function(){
		var c = arguments.callee;
		c._f.apply(c._e, c._a);
	};
	f._e = el;
	f._f = func;
	f._a = args;
	setTimeout(f, 1);
};
/** Удалить хандлер события
 * @private
 * @param {HTMLElement} el
 * @param {Function} func
 * @param {Array} args
 */
JSIInclude.clearCH = function(el){
	if(JSI.isIE()){
		el.onreadystatechange = null;
	}else{
		el.onload = null;
	};
};
/**
 *
 * @public
 * @param {String} jn
 * @param {String} code
 * @param {String} type
 * @return {HTMLElement}
 */
JSIInclude.pushSCRIPTTag = function(jn, code, type){
	var j = JSIHost[jn];
	var s = JSI.d().createElement('SCRIPT');
	if(!type){
		type = 'text/javascript';
	};
	s.setAttribute('type', type);
	s.text = code;
	j.tag.appendChild(s);
	return j.getInfo(s);
};
/**
 *
 * @private
 * @param {String} jn
 * @param {String} code
 * @param {String} type
 * @return {HTMLElement}
 */
JSIInclude.tryPushSCRIPTTag = function(jn, code, type){
	var o;
	try{
		o = JSIInclude.pushSCRIPTTag(jn, code, type);
	}catch(e){
		var j = JSIHost[jn];
		j.callbacks.throwException(e, null, '');
	};
	return o;
};
/**
 *
 * @public
 * @param {String} jn
 * @param {String} code
 * @param {String} type
 * @return {HTMLElement}
 */
JSIInclude.pushSTYLETag = function(jn, style, type){
	var j = JSIHost[jn];
	var s = JSI.d().createElement('STYLE');
	if(!type){
		type = 'text/css';
	};
	s.setAttribute('type', type);
	j.tag.appendChild(s);
	if(JSIMain.ieBrowser){
		s.styleSheet.cssText = style;
	}else{
		try{
			s.innerHTML = style;
		}catch(e){
			s.innerText = style;
		};
	};
	return j.getInfo(s);
};
/**
 *
 * @private
 * @param {String} jn
 * @param {String} code
 * @param {String} type
 * @return {HTMLElement}
 */
JSIInclude.tryPushSTYLETag = function(jn, style, type){
	var o;
	try{
		o = JSIInclude.pushSTYLETag(jn, style, type);
	}catch(e){
		var j = JSIHost[jn];
		j.callbacks.throwException(e, null, '');
	};
	return o;
};
//----------------------------------- ОБЪЕКТ ОБЁРТКА ДЛЯ JavaScript ОБЪЕКТОВ ПЕРЕДАВАЕМЫХ НАПРЯМУЮ
/**
 *
 * @param {Object} v
 */
FLSimple = function(v){
	this.data = v;
};
//----------------------------------- ОБЪЕКТ ОБЁРТКА ДЛЯ ВСЕХ ОБЪЕКТОВ ИЗ FLASH СРЕДЫ
/**
 *
 * @param {Object} j
 * @param {Object} n
 */
FLObject = function(j, i){
	this.jsi = j;
	this.info = i;
	this.name = i.value;
};
JSI.fo = FLObject.prototype;
//---------------------------------------------------------------------------------------------------- FLObject PUBLIC
/** Вызвать свойство/метод из флеш объекта
 *
 * @param {Object} n
 * @param {Object} a
 * @param {Object} u
 */
JSI.fo.call = function(n, a, u){
	if (!a) {
		a = [];
	};
	if(arguments.length<=2){
		u = '';
	};
	return this.jsi.callbacks.callProperty(this.name, n, a, u);
};
/** Проверить наличие свойства во флеш объекте
 *
 * @param {Object} n
 * @param {Object} u
 */
JSI.fo.has = function(n, u){
	if(arguments.length==1){
		u = '';
	};
	return this.jsi.callbacks.hasProperty(this.name, n, u);
};
/** Получить значение свойства из флеш объекта
 *
 * @param {Object} n
 * @param {Object} u
 */
JSI.fo.get = function(n, u){
	if(arguments.length==1){
		u = '';
	};
	return this.jsi.callbacks.getProperty(this.name, n, u);
};
/** Установить свойство во флеш объекте
 *
 * @param {Object} n
 * @param {Object} v
 * @param {Object} u
 */
JSI.fo.set = function(n, v, u){
	if(arguments.length<=2){
		u = '';
	};
	return this.jsi.callbacks.setProperty(this.name, n, v, u);
};
/** Удалить свойство из флеш объекта
 *
 * @param {Object} n
 * @param {Object} u
 */
JSI.fo.del = function(n, u){
	if(arguments.length==1){
		u = '';
	};
	return this.jsi.callbacks.deleteProperty(this.name, n, u);
};
/** Получить данный флеш объект не как ссылку, а напрямую - с последующей пастеризацией и потерей связи с флеш окружением.
 *
 */
JSI.fo.getAsSimple = function(){
	return this.jsi.callbacks.callCommand(this.name, 'asSimple');
};
/** Получить список свойств флеш объекта
 *
 * @param {String} ac - R,W,RW,D(только динамические, не объявленные свойства)
 */
JSI.fo.getPropertyList = function(ac){
	return this.jsi.callbacks.callCommand(this.name, 'propertyList', arguments);
};
/** Получить список методов флеш объекта
 *
 */
JSI.fo.getMethodList = function(){
	return this.jsi.callbacks.callCommand(this.name, 'methodList');
};
/** Получить имя класса флеш объекта
 *
 */
JSI.fo.describeType = function(){
	return this.jsi.callbacks.callCommand(this.name, 'describeType');
};
/** Получить имя класса флеш объекта
 *
 */
JSI.fo.getClassName = function(){
	return this.jsi.callbacks.callCommand(this.name, 'className');
};
/** Получить имя супер класса флеш объекта
 *
 */
JSI.fo.getSuperClassName = function(){
	return this.jsi.callbacks.callCommand(this.name, 'superClassName');
};
/** Удалить данный объект из стека ссылок
 *
 */
JSI.fo.remove = function(){
	return this.jsi.callbacks.removeObject(this.name);
};
//---------------------------------------------------------------------------------------------------- FLObject STATIC
/** Создать флеш объект
 *
 * @param {String} cn
 * @param {Array} a
 * @param {String} jn
 */
FLObject.create = function(cn, a, jn){
	var j = JSI.get(jn);
	if(arguments.length<2 || a==null){
		a = [];
	}else if(!(a instanceof Array)){
		a = [a];
	};
	return j.callbacks.createObject(cn, a);
};
/** Получить флеш объект по пути к нему
 *
 * @param {Object} p
 * @param {Object} jn
 */
FLObject.instance = function(p, t, jn){
	var j = JSI.get(jn);
	return j.callbacks.instanceObject(p, t);
};
/** Удалить все ссылки на флеш объекты
 *
 * @param {Object} flc удалить Flash каллбеки
 * @param {Object} flo удалить Flash объекты
 * @param {Object} jsc удалить JavaScript каллбеки
 * @param {Object} jso удалить JavaScript объекты
 * @param {Object} jn имя JSI объекта
 */
FLObject.clear = function(flc, flo, jsc, jso, jn){
	var l = arguments.length;
	if(l<1) flc = true;
	if(l<2) flo = true;
	if(l<3) jsc = true;
	if(l<4) jso = true;
	var j = JSI.get(jn);
	j.clear(flc, flo);
	return j.callbacks.objectsClear(jsc, jso);
};
/** Получить флеш объект stage
 *
 * @param {Object} jn имя JSI объекта
 */
FLObject.stage = function(jn){
	var j = JSI.get(jn);
	return j.callbacks.instanceObject('stage');
};
/** Получить флеш объект root timeline
 *
 * @param {Object} jn имя JSI объекта
 */
FLObject.root = function(jn){
	var j = JSI.get(jn);
	return j.callbacks.instanceObject('root');
};
/** Получить флеш объект ApplicationDomain.currentDomain
 *
 * @param {Object} jn имя JSI объекта
 */
FLObject.applicationDomain = function(jn){
	var j = JSI.get(jn);
	return j.callbacks.instanceObject('applicationDomain');
};
/**
 * @private
 */
FLObject.defaultFLProperty = '_flObject';
/**
 * @private
 */
FLObject.classInfoProperty = 'className';
/**
 * @private
 */
FLObject._flashTypes = {};
/**
 *
 * @param {String} cn имя класса Flash объекта
 * @param {Function} jf Конструктор JavaScript класса или функция
 * @param {Boolean} af Если TRUE, то запускать передаваемую JavaScript функцию через оператор "()", а если FALSE(по умолчанию), то через оператор "new".
 * @param {String} jn имя JSI объекта
 * @param {Boolean} up Если TRUE, то объект FLObject передаётся после создания объекта в указанное свойство, а если FALSE - передаётся в качестве единственного аргумента.
 * @param {String} pn имя аргумента в котором содержится объект FLObject.
 */
FLObject.registerWrapper = function(cn, jf, af, jn, up, pn){
	var c;
	if(!jn) jn = JSI.first.name;
	if(jn in FLObject._flashTypes) c = FLObject._flashTypes[jn];
	else FLObject._flashTypes[jn] = c = {};
	cn = FLObject.convertFlashClassName(cn);
	if(cn && jf){
		if(!pn) pn = FLObject.defaultFLProperty;
		c[cn] = {name:cn, func:jf, asFunc:af, useProp:up, prop:pn};
	};
};
/**
 * @private
 * @param {String} cn имя класса Flash объекта
 * @return String
*/
FLObject.convertFlashClassName = function(cn){
	if(cn && cn.indexOf('.')>0 && cn.indexOf(':')<0){
		var i = cn.lastIndexOf('.');
		cn = cn.substr(0, i)+'::'+cn.substr(i+1);
	};
	return cn;
};
/**
 *
 * @param {String} cn имя класса Flash объекта
 * @param {String} jn имя JSI объекта
 * @return Boolean
 */
FLObject.hasRegisteredWrapper = function(cn, jn){
	if(!jn) jn = JSI.first.name;
	cn = FLObject.convertFlashClassName(cn);
	if(jn in FLObject._flashTypes && cn) return cn in FLObject._flashTypes[jn];
	return false;
};
/**
 *
 * @param {String} cn имя класса Flash объекта
 * @param {String} jn имя JSI объекта
 * @return Object
 */
FLObject.getWrapperInfo = function(cn, jn){
	if(!jn) jn = JSI.first.name;
	cn = FLObject.convertFlashClassName(cn);
	if(jn in FLObject._flashTypes && cn) return FLObject._flashTypes[jn][cn];
	return null;
};
/**
 * @private
 * @param {FLObject} fl Объект типа FLObject, для которого создаётся оболочка
 * @param {String} cn имя класса Flash объекта
 * @param {String} jn имя JSI объекта
 * @return Object
 */
FLObject.createWrapper = function(fl, cn, jn){
	if(!jn) jn = JSI.first.name;
	var r;
	var o = FLObject.getWrapperInfo(cn, jn);
	if(o.asFunc){
		if(o.useProp){
			r = o.func();
			r[o.prop] = fl;
		}else{
			r = o.func(fl);
		};
	}else{
		if(o.useProp){
			r = new o.func();
			r[o.prop] = fl;
		}else{
			r = new o.func(fl);
		};
	};
	return r;
};
/**
 *
 * @param {String} cn имя класса Flash объекта
 * @param {String} jn имя JSI объекта
 */
FLObject.unregisterWrapper = function(cn, jn){
	if(!jn) jn = JSI.first.name;
	cn = FLObject.convertFlashClassName(cn);
	if(jn in FLObject._flashTypes && cn) delete FLObject._flashTypes[jn][cn];
};
/**
 *
 * @param {String} jn имя JSI объекта
 */
FLObject.unregisterAllWrappers = function(jn){
	if(!jn) jn = JSI.first.name;
	delete FLObject._flashTypes[jn];
};

//---------------------------------------------------------------------------------------------------- FLSimple PUBLIC
//---------------------------------------------------------------------------------------------------- FLSimple STATIC