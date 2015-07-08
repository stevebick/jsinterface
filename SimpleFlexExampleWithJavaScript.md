# Tips #

People having problems with JSInterface in Flex because to make bidirectional connect between Flex application and JavaScript you need to pass into JSInterface.init() function current Stage instance or any DisplayObject that already added to display list. Main application in Flex did not immediately have access to Stage, so you need to pass Stage instance directly from Application.stageManager.stage property.

If you are trying to run some JavaScript within your Flex application, you should try this code on HTML page to get rid of JavaScript errors, before adding this code to Flex application. Also, debug mode is turned ON by default and you can see JavaScript errors in Trace output window. To enable errors you need to disable JSInterface.traceExceptionOnly property setting it to FALSE -- in this case JavaScript errors will init debug session just like Flash application errors.

When debug is done, you can disable JSInterface debug mode disabling JSInterface.redirectJavaScriptExceptions and JSInterface.redirectFlashExceptions, this will increase application speed, sometimes dramatically. :)

Some of JavaScript methods cannot be executed outside of context, for example, Document.createElement. If you are trying to execute this function directly -- use Function.call() and Function.apply() methods with Document object used as scope.


# Example #
```
<?xml version="1.0" encoding="utf-8"?>
<s:Application xmlns:fx="http://ns.adobe.com/mxml/2009" 
			   xmlns:s="library://ns.adobe.com/flex/spark" 
			   xmlns:mx="library://ns.adobe.com/flex/mx" minWidth="955" minHeight="600" creationComplete="application1_creationCompleteHandler(event)">
	<fx:Metadata>
		[SWF(width="50", height="50", backgroundColor="#000000")]
	</fx:Metadata>
	<fx:Script>
		<![CDATA[
import aw.external.JSInterface;
import aw.external.jsinterface.JSDynamic;
import mx.events.FlexEvent;			
protected function application1_creationCompleteHandler(event:FlexEvent):void{
	JSInterface.initialize(this.systemManager.stage);
	var create:Function = JSInterface.document.createElement;
	var append:Function = JSInterface.document.body.appendChild;
	var div:JSDynamic = create.call(JSInterface.document, 'div');
	trace(div);
	div.style.position = "absolute";
	div.style.display = "block";
	div.style.top = "200px";
	div.style.left = "200px";
	div.style.width = "200px";
	div.style.backgroundColor = 0xFF0000;
	div.style.verticalAlign = "middle";
	div.style.paddingTop = "95px";
	div.style.paddingBottom = "95px";
	append.call(JSInterface.document.body, div);
	var a:JSDynamic = create.call(JSInterface.document, 'a'); 
	div.appendChild(a);
	a.href = "http://google.com";
	a.innerHTML = "Link";
}
			
		]]>
	</fx:Script>
	<fx:Declarations>
		<!-- Place non-visual elements (e.g., services, value objects) here -->
	</fx:Declarations>
</s:Application>
```