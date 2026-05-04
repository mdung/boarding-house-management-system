package com.boardinghouse.repository;

import com.boardinghouse.entity.ServiceCatalogRecipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceCatalogRecipeRepository extends JpaRepository<ServiceCatalogRecipe, Long> {
    List<ServiceCatalogRecipe> findByCatalogId(Long catalogId);
    void deleteByCatalogId(Long catalogId);
}
