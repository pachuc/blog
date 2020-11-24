---
tags:
    - programming
    - work
    - Ruby
title: "Crossing the Rubicon"
date: 2020-11-23T21:55:38-05:00
draft: false
---

Recently, since I started my new job at ID.me, I have had to learn Ruby. I had no previous experience in Ruby or Rails, so this will be a python nerd's first introduction to Ruby. Upon quick inspection, Ruby feels similar to python in many ways, so I don't expect it to be too difficult to pick up. Hopefully as I wade through the tall grass I can point out where the snakes and gems lie.

# Basics

The first thing I set out to do is quickly read up on the basics and syntax of Ruby.

###### Syntax

Hello World
```
#!/usr/bin/ruby -w 
puts "Hello, Ruby!";
```

- Open source, server side, interpreted language. Has a REPL just like python
- ```ruby``` is the main ruby installation. ```ruby -v``` provides the current ruby version. Interactive REPL started by calling ```irb```.
- ```.rb``` is the ruby extension. 
- Lines can be terminated by semicolons or new lines. However, lines ending with operator characters including backslash will be interpreted as continuing to the next line.
- Whitespace generally ignored in Ruby. Sometimes, however, they are used to interpret ambiguous statements. Interpretations of this sort produce warnings when the -w option is enabled.
- Ruby identifiers are case-sensitive
- ```#``` used for comments
- ```puts``` and ```print``` can be used for printing to stdout. ```puts``` adds a newline at the end of the string, while ```print``` does not.
- Ruby can use ```<<``` notation to print continuous blocks of text or execute blocks of commands.
- Ruby also has ```BEGIN``` & ```END``` blocks that will explicitly be run at the beginning or end of a ruby script.
- ```=begin``` & ```=end``` can be used to form block comments.
- Code blocks such as conditionals, classes, functions etc. are terminated by ```end```.
- Ruby pseudo variables:
	- ```self``` − The receiver object of the current method.
	- ```true``` − Value representing true.
	- ```false``` − Value representing false.
	- ```nil``` − Value representing undefined.
	- ```__FILE__``` − The name of the current source file.
	- ```__LINE__``` − The current line number in the source file.
- ```\``` is the escape character
- ```?a``` produces the character code for 'a'

###### Concepts & Structures

- Everything in Ruby is considered an object, and so Ruby does not really have primitives in the normal sense.
- Ruby is very much object oriented, and most Ruby code is written as hierarchical series of classes with, inheritance, overriding, varying scope and encapsulation enforcement.
- Ruby supports a variety of variable scopes. Global variables are declared with ```$``` and instance variables are declared with ```@```. Ruby has a concept of Class variables. These variables are shared between all instances of a class. These are declared using ```@@```. Ruby has a concept of local variables as well. These variables start with either a lowercase letter or ```_```.
- Ruby has shortcuts for automatically setting setters and getters for instance variables: ```attr_accessor```, ```attr_reader``` and ```attr_writer```. Without implicit declaration to set these things, ruby variables will be encapsulated. 
- Ruby functions/methods have many strange properties. Ruby functions can be called without parenthesis. Arguments can be passed even without parenthesis. By default Ruby functions do not fail loudly, rather they return true/false based on whether they error'd or not. To explicitly force Ruby functions to throw exceptions, the method signature should end with ```!```.
- Ruby supports decimal, integers, hexadecimal, octal, binary, and scientific notation literals.
- Ruby supports ranges using this syntax: ```(10..15)```
- Ruby supports arrays and hashes:

```
ary = [  "fred", 10, 3.14, "This is a string", "last element", ]
hsh = colors = { "red" => 0xf00, "green" => 0x0f0, "blue" => 0x00f }
```

- hashes can be accessed like so ```hash["key1"]```
- arrays accessed the same way ```arr[2]```
- Ruby also has some array methods. Adding to the end of an array is ```push```, adding to the beginning is ```unshift``` and adding to a specific index is ```insert```.
- Ruby has try/catch/exception blocks. The except block in ruby is called rescue. 

```
begin
    #... process, may raise an exception
rescue =>
    #... error handler
else
    #... executes when no error
ensure
    #... always executed
end
```

- Rails provides a logger instance that takes strings. The method used to invoke the logger indicates the logging level.

```
Rails.logger.info
```

# Ecosystem

- gem is the ruby package manager. ruby packages are known as gem.
- rspec seems to be the go to ruby test framework
- obviously rails is the main draw of ruby and the go to web application framework

###### Rails

- Rails requires a JavaScript runtime (node.js + yarn). This is due to the default rails Asset Pipeline. Asset Pipeline takes care of js transpilation, as well as js & css concatenation/minification. It also has a neat system called fingerprinting, which names the minified file based on a hash of its contents, so when the files contents change, so does its generated name.
- Also noticed Rails requires a database for default installation. This is because rails is very much tied to the concept of a database backed app, and the concept of ActiveRecord. ActiveRecord is just the concept of a database model class with data and methods that clearly represent how to interact with it.
- ```rails new``` to start a new rails project
- rails is built on another ruby gem named rack. rack is a simple wrapper around http requests.
- rails generates Gemfile & Gemfile.lock (requirements & dependency hash for gems), as well as package.json (yarn dependency file).
- the application code & logic lives under the app folder.
- bin contains default rails scripts for common processes such as build and deploy
- config contains the application config files
- db contains database schema and migrations
- log contains application logs
- lib contains extended modules for the application
- test for test cases & data
- tmp for temporary files

###### Concurrency & Parallelism

- Ruby, much like Python, has a GIL. This makes parallelism in Ruby difficult out of the gate.
- Ruby has a Thread class, but due to GIL, performance gains are minimal.
- Ruby also provides a Process module to fork out other processes to the system. This can provide real parallelism and gains in speed.
- Process.Fork puts some burden on the developer to understand and manage the procs they've spawned so as not to orphan procs.
- There is a gem called parallel which wraps the Process.Fork functionality
- Puma is a concurrent multi-threaded ruby web server. This is the default webserver implementation built into rails.
- Sidekiq is a gem for background processing in Ruby that can integrate closely with rails. 

###### Dependency Management

- A ruby package is called a gem. Ruby's package manager is called 'rubygems' and comes installed in Ruby now. Rubygems can be invoked by the command ```gem```. Rubygems is essentially like pip in python.
- Much like package.json/requirements.txt, etc, Ruby has Gemfile. Gems for a project can be added to the Gemfile using ```gem install```.
- Bundle is a more sophisticated package management solution for Ruby. Bundle allows managing gems of a project.  If ```gem``` is ```pip```, then ```bundle``` is ```pipenv```. Bundle allows adding new gems to a project, installing all the gems in one shot, and automatically managing a Gemfile as well as a Gemfile.lock (lock file containing hashes of all the dependency and sub-dependency versions).
- There are two popular tools for managing multiple ruby versions on your machine, so that you can have the correct ruby version for each project: rvm & rbenv.  The consensus seems to be using rbenv because it is a lighter weight tool, and has a less invasive method of 'shimming' ruby calls to the appropriate version, thus leading to less strange/unexpected behavior. 
- Importing dependencies is done by using ```require```. Modules are packaged into hierarchical namespaces. Namespaces can be accessed via the ```::``` operator. An entire namespace can also be brought into the class by using the ```include``` statement. Rails manages a lot of this for you, so you don't need to require your dependencies in your code.

# Dev Environment

###### Puma

Puma is a gem webserver, used widely by the Rails & ruby community. Puma-dev allows one to set up local dns configuration, so that links are automatically routed to your rails apps, and it automatically launches the appropriate rails apps.  Puma can even point links at specific ports on your machine, so that non-rails apps can also be integrated into your puma environment.

I set up some helpful aliases for working with Puma:
```
alias puma_logs="tail -f ~/Library/Logs/puma-dev.log"
alias stop_puma="puma-dev -stop"
alias reset_puma="cd ~/.puma-dev/; find . -type l -exec unlink {} \\; cd -;"
alias list_puma="cd ~/.puma-dev/; ls -l; cd -;"
```

###### OSX

I am developing on OSX, so I needed xcode to compile local bindings & other C dependencies for certain Ruby gems. I found that I had issues with the latest releases of xcode, and was forced to download the 11.5 release to get everything to work.

xcode version (12.2):
```
❯ pkgutil --pkg-info=com.apple.pkg.CLTools_Executables
package-id: com.apple.pkg.CLTools_Executables
version: 12.2.0.0.1.1603499215
volume: /
location: /
install-time: 1606080903
groups: com.apple.FindSystemFiles.pkg-group
```

Error compiling puma (4.3.5)
```
compiling puma_http11.c
puma_http11.c:203:22: error: implicitly declaring library function 'isspace' with type 'int (int)' [-Werror,-Wimplicit-function-declaration]
  while (vlen > 0 && isspace(value[vlen - 1])) vlen--;
                     ^
puma_http11.c:203:22: note: include the header <ctype.h> or explicitly provide a declaration for 'isspace'
1 error generated.
make: *** [puma_http11.o] Error 1

make failed, exit code 2
```

Not sure what else will fail -- and if/when xcode 12 will work -- but I found that so far, I've had no problems with xcode 11.5.

I also did not realize, when I was setting up my new Macbook, that OSX now ships with zsh as its default shell. I have been a zsh user for a long time now, but having it as the default was a surprise. Once I realized that zsh is the default shell, I understood that I need to add my config parameters to zshrc, which solved many of my issues.

# Conclusion

At this point I have just dipped my toes in the river. I have much more to learn, and some of my opinions will be uninformed. Still, I will give my hot take impression of the language thus far.

- Personally I am not a fan of the deeply object oriented approach to building things. I find that with strong encapsulation and class nesting/inheritance, it can be hard to wrap your head around new code. Often reading this kind of code is like descending down a rabbit hole of nested classes. Encapsulation also makes it exceedingly difficult to shim & patch things, to adapt it to your needs, which is supposed to be strength of languages like Ruby/Python. Furthermore, explicit encapsulation, with the need to set things like setters & getters, feels trite. There are much better ways to secure your code & lock things down. I prefer a functional approach with limited side-effects, as an isolated function of inputs & outputs is much easier to read, debug, and test independently. I know Python also has a lot of these object-oriented design patterns, but it feels more flexible and up to the user as to whether they wish to use them.
- Ruby is weird. It has a lot of syntaxes that allows it to be used in many ways. This is a good thing in that it provides flexibility, but it can also be bad in that it overcomplicates things for newcomers. One example is using ```!``` to have functions raise errors, versus defaulting to returning true/false. It is be better to stick to one consistent form of error handling. Furthermore, I feel that its probably best to just have code always blow up and raise exceptions loudly, requiring developers to explicitly catch and handle these errors. Returning true/false seems like an anti-pattern.
- Rails is a very mature ecosystem, that is easy to start working with. There are tons of resources, and a great community to answer any questions you may have. Working with such a mature framework is great, as many of the pitfalls have already been identified and sorted out.

Overall, I am enjoying diving into Ruby. I may not agree with all of its design patterns, and I doubt it will every be my favorite language, but it is still a fun adventure. I feel as if I have just taken my first step down the yellow brick road to emerald city, so I'm sure there is still of ton to learn along the way. I will either update this post as new things come to me, or make some follow up posts to document my journey.