#!/bin/bash

source_dir="my-artifact"
target_base_dir="packages"

for package_dir in "$source_dir"/*; do
  if [ -d "$package_dir" ]; then
    package_name=$(basename "$package_dir")
  fi

  target_dir="$target_base_dir/$package_name"

  if [ -d "$target_dir" ]; then
    echo "Moving .node files from $package_dir to $target_dir"
    mv "$package_dir"/*.node "$target_dir/"
  else
    echo "Target directory $target_dir does not exist. Skipping."
  fi
done
