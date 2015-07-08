# JSInterface 2 #

  * [Introduction](http://code.google.com/p/jsinterface/wiki/help_english#intro)
  * [The basics](http://code.google.com/p/jsinterface/wiki/help_english#basics)
  * [Inside](http://code.google.com/p/jsinterface/wiki/help_english#inside)
  * [What to work with](http://code.google.com/p/jsinterface/wiki/help_english#work_with)
  * [Examples](http://code.google.com/p/jsinterface/wiki/help_english#examples)
  * [Working in Flash Player environment](http://code.google.com/p/jsinterface/wiki/help_english#flash)
  * [Working in !JavaScript environment](http://code.google.com/p/jsinterface/wiki/help_english#javascript)
  * [Processing errors](http://code.google.com/p/jsinterface/wiki/help_english#errors)
  * [Managing memory](http://code.google.com/p/jsinterface/wiki/help_english#memory)
  * [Additional features](http://code.google.com/p/jsinterface/wiki/help_english#addition)

Thank's to [wellgames.com](http://wellgames.com/) for documentation translation!

<font color='#ffffff'>
intro<br>
</font>
## Introduction ##
JSInterface library allows managing HTML environment of an SWF application located on an HTML page. With its help you can get access to any JavaScript object, execute JavaScript functions, create JavaScript objects and functions. Apart from the standard options JSInterface has a set of methods for quick access to frequently used functions – setting page title, anchor or status, downloading a JavaScript or CSS file, executing a function by time-out. JSInterface allows “transferring” objects and functions from JavaScript environment to Flash Player environment and address them as if it happened in JavaScript code – in real time. You can also create and get access to objects created in ActionScript and manage them from JavaScript.

Example of JavaScript code:
```
	// JavaScript
	window.location.hash = 'hello_world';
	alert("Hello world!");
	document.onclick = function(){
		alert("Click!");
	}
```

Example of ActionScript 3 code completing the same tasks:
```
	// ActionScript 3	
	package {
		import aw.external.JSInterface;
		import aw.external.jsinterface.objects.JSWindow;
		import flash.display.Sprite;
		[SWF(width=10,height=10)]
		public class Test extends Sprite{
			public function Test():void{
				super();
				JSInterface.initialize(this);
 				
				// JSInterface code starts here
				var window:JSWindow = JSInterface.window;
				window.location.hash = 'hello_world';
				window.alert("Hello world!");
				window.document.onclick = function(...args):void{
					JSInterface.window.alert("Click!");
				}
			}
		}
	}
```

I tried to repeat the JavaScript syntax at the maximum, as ActionScript 3 (and, of course, my knowledge) allowed me, it was necessary in order to facilitate transfer of JavaScript instructions to the body of ActionScript program. This will also help developers who have already used JavaScript to adapt quicker and will save them from unnecessary questions and documentation. :)


<font color='#ffffff'>
basics<br>
</font>
## The basics ##
Operation of JSInterface adds up to calling methods call and addCallback of ExternalInterface class, which is the basis for the whole library. With the help of these methods and a simple protocol data exchange between the SWF application and its environment takes place. But ExternalInterface does not include information of specific object type when transferring objects, and only the listed properties are taken into account when copying object properties.

That’s why the following rules will always be valid for ExternalInterface:
  1. Instead of complex objects you transfer their copies of Object type, not related to the original objects in any way.
  1. Only dynamically added object properties are used, that is announced properties are not transferred.
  1. The data received from JavaScript do not preserve connection with original objects, that is you can’t get a reference to a JavaScript object or function.

These limitations result in the necessity for you to create copies of objects before transferring data yourself, and you have to realize additional interfaces for realizing closer interaction. JSInterface will help you solve all the problems:
  1. Complex objects can be transferred to JavaScript directly, it gives you a possibility to receive the most appropriate information, influence their behavior, calling for their methods, or change the values of their properties.
  1. Upon transferring a reference to an object to JavaScript environment or upon getting a reference to a JavaScript object the connection with the original objects is preserved, as well as the possibility to request for any property or method by name.
  1. You can moderate the procedure of objects transfer – from reference or as a copy.

Actually, JSInterface doesn’t transfer objects – it creates an illusion of “alive communication” with an object from another environment by means of wrapper objects created for substituting the transferred objects. Wrapper object is created for informing on any actions with the object, in order to transfer the actions to the original object. Thus, JSInterface allows access both to JavaScript objects in Flash Player environment and to Flash objects in JavaScript environment.

JSInterface divides objects into two types – simple and complex. The main difference between them is that simple objects are transferred in usual way, by duplicating the value. And complex objects are not transferred, but instead of them wrapper objects typical for the environment are created, and they serve as representatives of these objects. These wrapper objects don’t contain any initial object data, but each wrapper is related to its object through a unique key, and it gets data from the source object only by request. Thus all the changes that occurred in the source object will be reflected in the wrapper object. And in case of usual copying (as with simple types) initial object data are copied at once and are not connected with the source object any more.

  * Simple ActionScript objects – `String`, `Number`, `int`, `uint`, `Boolean`, `Array`, `Object`. Instances of these classes are considered simple, but instances of their derivatives are not. For example, a usual array is a simple type, but a class derived from an array will be a complex type.
```
	// ActionScript 3
	var number:Number = new Number();
	var integer:int = 123;
	var string:String = new String("some string");
	var boolean:Boolean = false;
	var object:Object = {};
	var array:Array = new Array();
```
  * Complex ActionScript objects are any other objects derivative from `Object` and `Array`. Of course, simple objects are also derivative from `Object`, but they are described as simple in advance.
```
	// ActionScript 3
	import flash.display.Sprite;
	import flash.utils.Dictionary;
	var sprite:Sprite = new Sprite();
	var dictionary:Dictionary = new Dictionary();
	var object:ExtendedObject = new ExtendedObject();
	var array:ExtendedArray = new ExtendedArray();
```
  * Simple JavaScript values – `String`, `Number`, `Boolean` in case of literal use:
```
	// JavaScript
	var integer = 5;
	var boolean = true;
	var string  = "this is a string";
```
  * Any JavaScript objects – `String`, `Number`, `Boolean`, `Array`, `Object` and their derivatives. Even Boolean type, if its instance was created with "new" operator, is considered an object (in this case, a complex object):
```
	// JavaScript
	var integer = new Number(5);
	var boolean = new Boolean(true);
	var string  = new String("this is a string");
```
Though the difference between simple and complex objects is clear enough, the developer has a possibility to break the rules and transfer any objects the way he/she needs. _The rule can be circumvented by using special markers – JSSimple, JSComplex, FLSimple._


<font color='#ffffff'>
inside<br>
</font>
## Inside ##
JSInterface allows managing objects from two sides – both from Flash Player environment and JavaScript environment. Stacks for transferred complex objects are created in both environments upon JSInterface initialization. Such stacks contain references to original objects, JSInterface addresses them every time when a call for this object through its wrapper object takes place. Each object in the stack is identified with a unique key stored in the information transferred to the wrapper object. Such key is transferred in each operation with the object. The process of data transfer is roughly the same for transfer to both directions.

The sequence of actions for creating an object in another environment:
  * Creating the wrapper object.
  * Sending a request to the environment of the object being created for creating a new object.
  * Creating the original object.
  * Gathering information on the original object, its registration in the stack of transferred objects.
  * Retrieving information on the original object to the wrapper object and completing wrapper initialization.

The sequence of actions for changing value of a property of an object from another environment:
  * Wrapper object receives the request.
  * Processing of received data, as the property value.
  * Sending new property value, property name, and original object key with indication of operation type.
  * Application of the new value to the original object property.
  * Retrieval of data on the completed operation and occurred errors to the environment which initiated the operation (in case of allowed error messages translation).

The sequence of actions for calling an object method from another environment:
  * Wrapper object receives the request.
  * Processing of received data, as the property value.
  * Sending new property value, property name, and original object key with indication of operation type.
  * Calling for a method of the original object using the arguments
  * Retrieval of data on the completed operation, retrieved value and occurred errors to the environment which initiated the operation (in case of allowed error messages translation).
  * Retrieval of method execution value.

All these operations take place thanks to the simple protocol of data transfer between the environments. The protocol is simple enough to be the fastest possible. The protocol contains service data on the transferred information, simple type values, information on complex objects and information on occurred errors.

Moreover, all the operations passing through JSInterface, are moderated, which means that the final result will always be the consequence of processing the data received from another environment in JSInterface protocol format. Incoming and outcoming data – result of executing the operation – are moderated. It is necessary for tracing transfer of complex objects and replacing them with service data in time, as well as for analyzing and calling for error messages. Due to such moderation all JSInterface internal processes are well hidden, and the user gets what he should.


<font color='#ffffff'>
work_with<br>
</font>
## What to work with ##
The whole library, as many others, consists of a set of classes. You’ll work only with some of them:

**JSInterface** – the main class containing the methods of quick access and links to the main JavaScript  objects: window, document, navigator, event and DOM object of OBJECT/EMBED tag through which the program was announced. You can get acquainted with the available methods in more detail in the generated ASDoc documentation.

**JSDynamic** – a class working with JavaScript objects. It stores meta-data on the JavaScript object and connects each request for reception/recording/calling with this object. The full version of the component contains a lot of derivative classes that are inherited from this class, repeat DOM-objects, and facilitate work with JavaScript objects.

**JSFunction** – this class has only one statistical method which serves for creating JavaScript functions. Its essence is that you transfer the function body and accepted arguments separated with commas to it, and it retrieves a fully valid function. Each call for such a function will be accompanied with calling for the created JavaScript function.

**JSArguments** - it is designated for functions/methods transferred to JavaScript environment. If you register a function, then instead of arguments it will receive an instance of a JSArguments object as a single argument from JavaScript. Instances of the class contain the list of arguments and a reference to the JavaScript object in the scope of which the function was executed.

**JSSImple**, **IJSSImple** – These are a marker class and an interface enabling transfer of any value as simple data type without processing.

**JSComplex** – This is a marker class providing for transfer of any value as a complex object.

**FLObject** – a JavaScript class the instances of which are wrapper objects for complex objects coming from Flash Player environment.

**FLSimple** – a JavaScript class for marker objects indicating the necessity of transferring a JavaScript object as a simple data type.

The rest of classes are of utility character and are designated for serving the system, they are different managers and listeners.


<font color='#ffffff'>
examples<br>
</font>
## Examples ##
To start working with JSInterface you need to load and install the SWC library of JSInterface. The library can be loaded from this page, the “Downloads” section. There are two variants of the library – full and lite. The difference is that the full version features additional classes for work with JavaScript objects, and in the lite version objects of JSDynamic class are responsible for connection with JavaScript objects. _Both versions of the library are free of charge, and all the classes are available in the form of source codes, in the “[Source](http://code.google.com/p/jsinterface/source/checkout)” section._ Classes from the full version of the library will be used in the examples, but they can be adapted for the lite version by replacement of JavaScript object types with JSDynamic – this won’t lead to a mistake, as all the classes are derivative from JSDynamic.

In order to use JSInterface it should be initialized
```
	// ActionScript 3
	import aw.external.JSInterface;
	JSInterface.initialize(this);
```
This is the only obligatory condition for using the library. Any appeals to JavaScript objects before the initialization will lead to an error.

After initialization you can create JavaScript objects
```
	// ActionScript 3
	var obj:JSDynamic = new JSDynamic('Object');
```
In ActionScript you can’t create JavaScript objects directly through the object class – you should use JSDynamic class for these purposes and transfer the name of JavaScript object class and the list of arguments accepted by the constructor to it.

Getting access to JavaScript objects
```
	// ActionScript 3
	var body:JSDynamic = JSInterface.getInstance('window.document.body');
```
Instead of a JavaScript object you’ll get an object of JSDynamic type or its derivative, through which data exchange with the original JavaScript object will take place. The resulting object serves as proxy – it redirects all the calls (get,set,has,call,delete) for object properties and methods to the original JavaScript object and retrieves the result. After using such an object you can do all as with the usual JavaScript object and get the same results.

As functions and methods are also objects, you can get references to them:
```
	// ActionScript 3
	var byTagName:Function = body.getElementsByTagName;
```
In this case you’ll get a reference not to a JSDynamic object, but to a usual function that can be executed. This is a special function that will transfer the received arguments to the original JavaScript function and retrieve the result upon each call for it.

Get and set values, remove and check for presence of  JavaScript object properties
```
	// ActionScript 3
	body.attributes.getNamedItem('bgcolor').value = '#ff0000';
	body.document.onclick = function(...args):void{
		JSInterface.window.alert("Click!");
	}
```
All the actions are executed in the same way as for usual objects with the help of usual operators. As all properties of JavaScript objects are enumerated, they can also be circumvented with the usual `for…in` or `for each…in` in Flash Player environment.

Call for JavaScript functions and JavaScript objects methods
```
	// ActionScript 3
	var object:JSElement = byTagName('object')[0];
	if(object) object.click();
	var embed:JSElement = byTagName('embed')[0];
	if(embed) embed.click();
```
All calls for methods and functions will be redirected to the original objects and functions – they will be duplicated and the results of execution thereof will be retrieved.

Create JavaScript functions
```
	// ActionScript 3
	var func:Function = JSFunction.create('alert(arg1);', 'arg1');
	func('Hello world!');
```

Download JavaScript or CSS files to HTML environment
```
	// ActionScript 3
	JSInterface.loadCSS("style.css");
	JSInterface.loadJavaScript("script.js", this.loadJavaScriptComplete);
	...
	protected function loadJavaScriptComplete(event:JSDynamic=null):void{
		...
	}
```

The files will be downloaded and JavaScript will be executed directly in the HTML document.
As a result, the developer works with usual objects, properties and functions. He does everything as usual, with the exception of certain nuances, for example, creation of an object requires indicating the type in a parameter instead of indicating the class directly.

Collectively these simple operations enable simple integration of JavaScript environment with FlashPlayer environment, creating a close connection between them. In the "Downloads" section you can download examples of such integration and see how easy using JSInterface is and what a powerful tool it can be.

_More examples can be found in the "[Downloads](http://code.google.com/p/jsinterface/downloads/list)"._ section.


<font color='#ffffff'>
flash<br>
</font>
## Working in Flash Player environment ##
All the objects transferred by JavaScript will appear in Flash Player environment in the form of objects of JSDynamic type. Such a wrapper object transfers any request for getting a property value, calling for a method and other requests to the original JavaScript object and retrieves the result. JSDynamic is constructed on the basis of flash.utils.Proxy class, so its objects don’t require additional methods and properties for operation – you can address directly to the supposed properties and methods of the JavaScript object.

The full version of the library additionally features a set of classes imitating JavaScript objects. These classes describe the standard properties and methods of JavaScript objects and extend JSDynamic (using the same mechanisms). The classes can be useful for determination of the received object type, as in the full version JSInterface matches the types with the retrieved values, according to the specification. For example, it is definitely known that the Document.createElement() method retrieves an HTMLElement object, that’s why the JSDocument.createElement() method  will always retrieve JSHTMLElement (or NULL in case of failure). All the types of retrieved value of properties and methods of JavaScript objects that can be traced are already described in JSInterface according to specification, and there is no need to define them.
```
	// ActionScript 3
	import aw.external.JSInterface;
	import aw.external.jsinterface.objects.JSArray;
	import aw.external.jsinterface.objects.JSHTMLElement;

	JSInterface.initialize(this);
	var jsArray:JSArray = new JSArray(5);
	jsArray.length = 3;
	jsArray[0] = 1;
	jsArray[1] = 2;
	trace(jsArray); // 1,2,
	var element:JSHTMLElement = JSInterface.document.createElement('div');
	element.appendChild(JSInterface.document.createElement('label'));
	JSInterface.document.getElementsByTagName('body')[0].appendChild(element);
	trace(element.innerHTML); // <label></label>
```

TypeMap allows tying certain wrapper object types to properties and methods as the retrieved values. The only condition for using an own type is to use a child type of JSDynamic.

Besides using a chain of objects in the dotted notation you can use the JSInterface.getInstance() method for getting access to it. The method accepts a line containing the path to an object in JavaScript style and a Class object indicating the type of retrieved object as parameters. The second parameter is necessary as JSInterface can’t determine the type of the retrieved value by itself. And even if the type will be different, a JavaScript error will occur on the execution stage and only if you call for a non-existing method or commit other wrongful actions.
```
	// ActionScript 3
	import aw.external.JSInterface;
	import aw.external.jsinterface.objects.JSHTMLElement;

	JSInterface.initialize(this);
	var element:JSHTMLElement = JSInterface.getInstance('document.getElementsByTagName("body")[0]', JSHTMLElement);
	trace(element.innerHTML); // <script language="JavaScript" type...
```

JSInterface has properties allowing access to the main objects from JavaScript environment:
  * **window** - The main object in JavaScript objects structure on an HTML page. It is used as the storage for all global objects and functions, and you can get access to all of them through this object.
  * **document** - The root object of the DOM structure of an HTML document.
  * **navigator**  - A window.navigator object.
  * **event** - A window.event object.
  * **main** - A JavaScript object of the tag describing the current flash application.

Functions in JavaScript environment and in Flash Player environment are objects, and upon getting a link to a function (and only in this case – an object is not created upon a call) JSDynamic objects are created for them as for all objects. But as a result the user gets a link to a function connected with the JSDynamic object created for the function beforehand.
```
	// ActionScript 3
	JSInterface.initialize(this);
	var create:Function = JSInterface.document.createElement;
	var append:Function = JSInterface.document.body.appendChild;
	append(create('div'));
	append(create('a')); 


```

Upon necessity you can get access to a JavaScript function object in order to get access to its methods and properties. It can be needed, for example, for getting access to static methods and properties of a JavaScript class.
```
	// ActionScript 3
	JSInterface.initialize(this);
	var flObject:Function = JSInterface.window.FLObject;
	var flObjectClass:JSDynamic = JSDynamic.convertFunctionToObject(flObject);

```

JSinterface allows creating JavaScript functions with the help of JSFunction.create() method which accepts the function code and parameter names list as parameters. The parameter names list is not obligatory.
```
	// ActionScript 3
	import aw.external.JSInterface;
	import aw.external.jsinterface.JSDynamic;
	import aw.external.jsinterface.JSFunction;
	
	JSInterface.initialize(this);
	var cls:Function = JSFunction.create(
		'this.toString = function(){' + 
			'return this._flObject.call("toString");' + 
		'};'
	);
	var flObject:Function = JSInterface.window.FLObject;
	var flObjectClass:JSDynamic = JSDynamic.convertFunctionToObject(flObject);
	flObjectClass.registerWrapper('flash.display.Sprite', cls, false, null, true);
```

Two additional types of marker objects were created for transferring objects in JavaScript:

**JSComplex** - An object indicating that the transferred object should be transferred as a complex type notwithstanding its type.
```
	// ActionScript 3
	package {
		import aw.external.JSInterface;
		import flash.display.Sprite;
	
		public class Test extends Sprite{
			private const _jsSettings:Object = {};
			public function Test():void{
				super();
				JSInterface.initialize(this);
				JSInterface.window.fillSettings(new JSComplex(_jsSettings));
			}
		}
	}
```
**JSSimple** - An object indicating that the transferred object should be transferred as a simple type (that is directly, as through ExternalInterface) notwithstanding its type.
```
	// ActionScript 3
	import aw.external.JSInterface; 
	import mx.rpc.events.ResultEvent;
	protected function resultEventHandler(event:ResultEvent):void{
		JSInterface.initialize(this);
		JSInterface.window.getRemoteData(new JSSimple(event.result));
	}
```
JSSimple contains a set of static methods for indicating specific types that will be transferred to JavaScript environment as simple objects.
```
	// ActionScript 3
	import aw.external.JSInterface;
	import aw.external.jsinterface.JSSimple;
	
	JSInterface.initialize(this);
	JSSimple.addSimpleType(SomeDynamicObject);
	...
	var object:SomeDynamicObject;
	if(JSSimple.isSimpleType(SomeDynamicObject)){
		JSInterface.window.getSimpleType(object);
	}else{
		JSInterface.window.getSimpleType(new JSSimple(object));
	}
```
JSInterface also has IJSSimple interface describing just one method that retrieves an object (or any other type of data) transferred as a simple type. The data created through this method are not re-checked and are deemed a simple type.


<font color='#ffffff'>
javascript<br>
</font>
## Working in JavaScript environment ##
JSInterface implements to JavaScript environment utility classes and objects upon initialization. Among these classes are FLObject and FLSimple:

**FLObject** – a wrapper object for all objects of complex types transferred from Flash Player objects. Objects of this class have several methods providing for interaction with the original objects.
  * **get** – getting a property value
  * **set** – setting a property value
  * **has** – checking property existence
  * **delete** – deleting property
  * **call** – calling for method

If you send a complex type object to JavaScript environment, it will always be represented by a FLObject object through which the connection with the original object takes place. FLObject contains additional means allowing manipulating with the transferred objects and getting additional information on them. For example, you can’t just go over the properties of the original object, as the wrapper doesn’t have these properties, but you can get a list of existing properties.

FLObject also allows creating its own wrapper object for specific types of objects from Flash Player environment. It means that every time upon transfer of an object of such type an object of a user’s class will be transferred instead of FLObject. But the object should be connected with the original object from Flash Player environment with the help of a FLObject object that will be transferred to it upon creation.

The next stage of JSInterface development will most likely be duplication of the classes structure from FlashPlayer environment for using them in JavaScript environment. It’s the same as the creation of wrapper objects for objects from JavaScript environment.

Links to functions from Flash Player environment are formed in approximately the same way as for JavaScript functions in Flash Player environment. Getting a link to a function from Flash Player, the developer gets a JavaScript function (wrapper function) that can be called for as any other JavaScript function. Calling for a wrapper function will lead to transfer of arguments to Flash Player environment and call for the original function with the same arguments set. If the original function from Flash Player retrieves a value, it will be transferred, after executing the function, to the JavaScript function, and it will in its turn retrieve the result of execution.

**FLSimple** – The marker class provides for transferring the object to Flash Player environment as a simple data type, without any transformations.
```
	// JavaScript
	var w = 100;
	var h = 20;
	var matrix = FLObject.create('flash.geom.Matrix');
	matrix.call('createGradientBox', [w, h, Math.PI/2]);
	var root = FLObject.root();
	var sprite = FLObject.create('flash.display.Sprite');
	var g = sprite.get('graphics');
	g.call('beginGradientFill', [
		'linear', 
		new FLSimple([0xaaaaaa, 0x666666]), 
		new FLSimple([1, 1]), 
		new FLSimple([0, 255]), 
		matrix
	]);
	g.call('drawRoundRect', [0, 0, w, h, 8]);
	g.call('endFill');
	var txt = FLObject.create('flash.text.TextField');
	txt.set('width', w);
	txt.set('height', h);
	txt.set('htmlText', '<p align="center"><font face="Verdana" size="10">Hello world!</font></p>');
	sprite.call('addChild', [txt]);
	root.call('addChild', [sprite]);
```


<font color='#ffffff'>
errors<br>
</font>
## Processing errors ##
JSInterface allows getting information on the errors occurring in the environment where the work takes place. Such addressing of errors can be turned on and off. With the error transfer mechanism off JSInterface works faster, but the mechanism allows making errors finding and correcting easier. There is the option of reflection through output available for errors from JavaScript environment – the errors will be not called for, but just reflected in output. All the properties for managing errors are located in the main project class - JSInterface.


<font color='#ffffff'>
memory<br>
</font>
## Managing memory ##
The most important part of the project is the possibility to manage the assigned memory. And if in other projects it’s a pleasant addition, here it’s an unpleasant necessity. In simple cases, when JSInterface is not used for complicated tasks, it won’t be necessary. But in projects where complicated tasks with large data flow are realized it will be necessary to trace the cleaning of saved objects. The essence of such cleaning is that all the objects transferred as complex types are stored in stacks and not deleted when they are not needed any more. So the stacks can take up much memory if you work with objects of complex types intensively. Each wrapper object has `JSDynamic.js_interface::remove()` and `FLObject.remove()` methods for cleaning the stacks. After execution of the method the connection between the original object and its wrapper is broken and the wrapper becomes worthless.

If working with JSInterface can be divided into independent stages, you can use the methods of global cleaning JSInterface.clear() and FLObject.clear(), but after such cleaning all the connections are removed. Both methods do the same, but one acts in Flash Player environment and another one – in JavaScript environment.

One step for solving the problem could be applying `flash.utils.Dictionary` class using weak keys. But in this case there can occur a situation when the original object from Flash Player environment didn’t leave any references and was deleted by GC, and the JavaScript wrapper object tried to address the object and got an error. That is the existence of wrapper object does not guarantee the connection with the original object and it can disappear at any moment. That’s why the wrapper object and the original object are connected and the deletion thereof is the responsibility of the developer.


<font color='#ffffff'>
addition<br>
</font>
## Additional features ##
**PropertyInspector** - A set of classes allowing getting information on a class members, its methods and properties.

**EvalUtils** - Allows using string expressions as object indicators. It uses standard dotted notation and supports calling for functions, standard operations (including assignment operator), E4X (with the exception of E4X filters). It is used in the project as replacement for eval instruction.

**ClassUtils** - Works with class objects, contains additional methods for working with them.

**JSON** - Fast JSON encoder and decoder.