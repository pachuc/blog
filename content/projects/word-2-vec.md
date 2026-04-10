---
title: "Word 2 Vec"
date: 2025-12-13T16:32:01-05:00
draft: false
---

## Overview

This is an implementation of the Word2Vec model for my own learning purposes. There are a number of high level ways to create a Word2Vec model currently that require zero effort, and are probably implemented much better than this. The most prudent example being [Gensim](https://radimrehurek.com/gensim/), which can create a Word2Vec model with just a few lines of code. However, working at that level of abstraction, there is a lot of aspects that you can easily gloss over. The flipside of this is that I could implement this at a much lower level using numpy, or even just raw python, but that ends up going much deeper into the nitty gritties of matrix multiplication etc. Implementing this using raw PyTorch primitives is the goldilocks zone for my usecase/learning.

## Implementation Details

For this implemenation I used the [text8](https://mattmahoney.net/dc/textdata.html) corpus. This is a pre-made pre-cleaned dataset for this specific purpose, and so I was able to use it off the shelf. Reading about Word2Vec, I found that there are 2 famous implemenations: Bag of Words, and Skip Gram. For this implementation I decided to focus on Skip Gram. Skip Gram takes a context window, i.e a slice of words from the corpus, and using those words tries to predict the target (center) word. Using this algorithm, it is rewarded for learning context, and thus should be able to learn semantic meaning in it's embeddings.

This implemenation implements:

* A TextItterator class so that chunks of the training set can be read from disk without loading the whole thing into memory
* A SkipGram Dataset model that makes use to the TextItterator
* Subsampler class to remove extremely frequent words
* NegativeSampler class to create negative samples
* And of course a VocabBuilder to build the overall Vocabulary of the model, and the Word2Vec model class itself.

With all these pieces we set up the training pipeline and use the Adam built in pytorch optimizer to run the training loop. It offers a convinient CLI to kick of new training runs, or load the model to test its performance. It also supports using a yaml config to tune any of the hyperparameters to fit different runs/datasets.

## What I Learned

The biggest learning for me was the fundamentals of working with PyTorch and understanding the hyperparameters for the algorithm. For my first run, I did not realize I needed to specifically declare a device for PyTorch to run on, even thought I had gone through the pain of installing CUDA drivers. Thus, my first run made very little progress before I had to cancel it, and I discovered I was running on the CPU. My second run I ran it for 100 epochs, and around 80 epochs in I saw the loss was not improving much. After some research I learned that I should reduce my learning rate by an order of magnitude, and that ~15 epochs should be more than enough for my setup.

Overall this was a very simple project that taught me the very basics of developing a text model using pytorch. While I have developed other models in the past, generally I have used higher level abstracts to fit neural nets to data. Working at this level helped me understand the many pieces, such as the Adam optimization algorithm, using a negative sampler to get more out of the data, and using a subsampler to remove noise/high frequency words to help the model make better associations.

I also created a simple webui which you can play with to see the class king + woman = queen type behavior. Check it out [here!](https://github.com/pachuc/word2vec)