---
tags:
    - programming
    - work
    - Ruby
title: "Training on Rails"
date: 2021-01-03T15:21:38-05:00
draft: false
---

The next step in my journey into Ruby was learning Rails. Rails is a completely different language than vanilla Ruby. In fact, I would say its a bigger jump from vanilla Ruby to Rails, than it is from Python 2 to Python 3! First of all, Rails adds a ton of utility functions as [extensions](https://github.com/rails/rails/tree/master/activesupport/lib/active_support/core_ext) to the core language. This is particularly easy to achieve in Ruby since even the primitive types are objects that can be extended. Secondly--and obviously--it adds the Rails framework. It may be due to my inexperience, but Rails is the heaviest framework I have had experience working with.  This can be both good and bad. The good is that Rails is very powerful, and has many systems already in place for all sorts of things you may wish to do. This lets you rely on the framework to write most of the boiler plate, and ensures you have optimized, secure, battle tested code for the most common functionalities. The bad is that there is a lot of things to learn, and a lot of "magic" you need to understand, before you can easily follow what is happening in a Rails application.


# MVC


Rails is a dogmatic follower of the MVC paradigm, so let us start by using the same lens to break it down. Rails has three base classes, one for each of the MVC pieces, that integrate seamlessly with each other, and promote the overall rails way of doing things:

- Model: `ActiveRecord`
- Controller: `ActionController`
- View: `ActionView`

MVC classes are organized under the `models`, `controllers`, and `views` under `app` in the directory structure. Each project has an `ApplicationRecord`, `ApplicationController` and `ApplicationView` class that inherit from the base framework MVC classes. The rest of the classes then inherit from these default classes. This way common logic across the application can be centralized in these classes.


### ActiveRecord


The model class in Rails is called `ActiveRecord` because it conforms to the [Active Record pattern](https://en.wikipedia.org/wiki/Active_record_pattern).
ActiveRecord follows an intuitive naming pattern for its classes. For example, for a table named `stories` in the database, the corresponding ActiveRecord class would be `Story`. Rails is able to translate Model names to their plural forms using [Rails Inflector](https://api.rubyonrails.org/classes/ActiveSupport/Inflector.html). The Rails team has stated that this may have bugs/incorrect translations, but they will not be patching it, so as not to break legacy applications that rely on the mistranslation. Instead they recommend fixing it in your application code yourself, by manually specifying the model table relationship. 

The ActiveRecord class also introspects the table's columns and provides attributes on the class for each column. Beyond just providing a pure mapping of database columns, and abstracting out database connections & interactions, ActiveRecord also provides convenient syntax for defining the following database relationships between entities:

- one-to-one associations using `has_one` & `belongs_to`
- one-to-many associations using `has_many`
- many-to-many associations using `has_and_belongs_to_many`

Models can also have custom queries defined inside them using lambda functions. These are called `scopes`.

Many times it can be hard to understand what properties a rails model has available, and what associations the model has as well. This is largely solved by the rails console which lets us run our rails app in CLI. One can use the `Model.reflections` method to introspect a model and see its attributes and relations.


### ActionController, ActionView and Routing


Rails routing automatically links the user of an application to the appropriate controller and view. Default routing works like this: `/<controller_name>/<controller_method>`. Controller methods that handle incoming requests are called action methods. The request parameters are passed into the object via `params`. Rails automatically renders the view `/app/views/<controller_name>/<controller_method>.html.erb` when the action method returns. This can be overridden by explicitly calling `render`. All instance variables from an action method are automatically passed into the template. Variables can also be explicitly passed into the `render` function call using `locals`.

Rails routing lives in `config/routes.rb`, and uses a pattern called Resourceful Routing. This allows you to quickly declare routes for your controllers, and automatically maps HTTP verbs to the appropriate controller actions. Here is a table of default Resourceful Routing:


| HTTP Verb     | Path                | Controller#Action | Used for                                        |
| ------------- | ------------------- | ----------------- | ------------------------------------------------|
| GET           | /photos             | photos#index      | display a list of all photos                    |
| GET           | /photos/new         | photos#new        | return an HTML form for creating a new photo    |
| POST          | /photos             | photos#create     | create a new photo                              |
| GET           | /photos/:id         | photos#show       | display a specific photo                        |
| GET           | /photos/:id/edit    | photos#edit       | return an HTML form for editing a photo         |
| PATCH/PUT     | /photos/:id         | photos#update     | update a specific photo                         |
| DELETE        | /photos/:id         | photos#destroy    | delete a specific photo                         |


Rails also provides helper functions for routing to controller actions:


| HTTP Verb     | Path                    | action            | named helper                |
| ------------- | ----------------------- | ----------------- | --------------------------- |
| GET           | /admin/posts            | index             | admin_posts_path            |
| GET           | /admin/posts/new        | new               | new_admin_post_path         |
| POST          | /admin/posts            | create            | admin_posts_path            |
| GET           | /admin/posts/:id        | show              | admin_post_path (:id)       |
| GET           | /admin/posts/:id/edit   | edit              | edit_admin_post _path(:id)  |
| PUT           | /admin/posts/:id        | update            | admin_post_path (:id)       |
| DELETE        | /admin/posts/:id        | destroy           | admin_post_path (:id)       |


Beyond this out of the box capability, the router also offers lots of customizability and features to tailor your routes, including hierarchical routes, or only allowing certain verbs on certain routes.

Rails also facilitates the translation and localization of templates using it i18n gem. This method provides two key methods: `translate` aliased as `t` and `localize` aliased as `l`. `translate` is used for translating strings to different languages using language templates, and `localize` is used for converting timestamps to the local timezone. Localization files are located under `config/locales`. A string name and appropriate substitution variables are passed into translate which then picks the correct translation from the localization files based on the current locale, and performs the string substitutions. `translate` also calls some helper functions on the template strings such as `html_safe` depending on the template settings and string keys.


### Tying it all Together


The three core classes of the Rails MVC paradigm, are closely coupled and tightly integrated. This makes using the framework in its intended fashion extremely painless out-of-the-box, and promotes the "Rails way" of doing things. Since the model fields are automatically introspected, the naming convention for these things remains rock solid across applications. Implicit connections between models, views and controllers, helps to avoid lots of boiler plate code. In this paradigm users can write terse application code, that simply describes their business logic. Finally, the tight implicit coupling makes it natural to consolidate most of the business logic in the controller, as promoted by the MVC paradigm.


# More Goodies


Beyond the standard MVC classes, Rails ships with a ton of other goodies included in the ActionPack library:

- `ActionController` Modules: The `ActionController` has some cool built in utilities that can save a lot of time in web development. Examples are `ActionController::Cookies` (allows general cookie management) and `ActionController::RequestForgeryProtection` (can be used to protect against Cross Site Request Forgery attacks).
- `ActionMailer`: Rails provides the `ActionMailer` class for sending out emails on certain application events, and describing the emails using standard Rails templating conventions. 
- `ActionMailbox`: A class for receiving and responding to emails using controller logic. 
- `ActionCable`: Allows Websocket integration into your Rails app, to facilitate more realtime interactions. 
- `ActionText`: A module for providing a WYSIWYG editor in your Rails application.
- `ActiveJob`: Provides and interface for queueing up asynchronous jobs in your Rails app.


# Conclusion


As I have mentioned many times in this post, Rails is a heavy, opinionated framework. It forces you into using its paradigms, which comes with many pros as well as cons. While it may not entirely force you, trying to circumvent it is an uphill battle, as everything is so tightly coupled. As the final section of this Rails overview, I would to provide my perspective, as a newcomer to the framework, to these pros and cons.

Pros

- It provides a well thought out method for implementing common functionalities. You can rely on battle-tested code rather than reinventing the wheel.
- It makes it easy to work on many Rails applications once you have learned the framework, as there is a standardized way to do things.
- Developing applications is fast, as you can avoid boilerplate code, and just focus on your application functionality.
- It makes it easy to stick to a standard way of doing things, which is especially helpful for large organizations.
- The framework avoids lots of code duplication by providing so much central functionality, and promoting easy ways for centralizing code in the app's core classes. 

Cons

- It forces you into the object oriented paradigm. This may be fine for most, but personally I prefer a functional style. I find it harder to trace through and reason about layers of extended classes, than to follow a series of function calls.
- It forces you into using `ActiveRecord`. There is a bit of a debate about whether Active Record is a good pattern to use, vs using a Data Mapper pattern. I think it comes down to your use case. Active Record is a great pattern if the models in your business logic closely match the schema of your database. A Data Mapper pattern is much better if your business logic is not coupled tightly with your schema, or if you are adapting a new application with new logic on top of an existing schema. A Data Mapper pattern essentially allows more decoupling  between your app's data structures and the underlying database. In either case, raw SQL is the best way to go if you are trying to do complicated queries and need to optimize for performance.
- It can be hard for a newcomer to read the code. The draw back of abstracting away so much boilerplate code is that it can be hard to follow without knowing about all this "magic". In some ways this is fine, after all, we expect that someone who works in a framework will learn that framework; however, Rails is a very large framework to learn, and it can be particularly tiresome if you are just jumping into some Rails code, rather than dedicating yourself to long term Rails development. When we write code ourselves, we strive to have the code be easy to read, and self documenting; however, large frameworks like Rails are the anti-thesis of this concept, requiring you to thoroughly read pages of documentation before you can even follow the flow of how things work.

Currently, I would say that the cons of Rails are impacting me a bit more, as I am new to the framework and even Ruby. As I continue to work in Rails, I expect my experience will be better, as I have already invested the time to learn its intricacies. Hopefully soon, I will be able to use the magic, rather than be mesmerized by it.
